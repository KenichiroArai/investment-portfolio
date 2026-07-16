"""一時投入: rakuten 口座に分析軸「口座区分」と分類値を作成し、明細の口座に合わせて銘柄へタグ付けする。

実行:
  python dev/sql/rakuten/seed_account_type_classifications.py

明細の holding_lines.account_id を正とする。特定・一般の両方に出る銘柄は
時価評価額比で allocation_weight を付ける。
"""

from __future__ import annotations

import datetime
import pathlib
import sqlite3
import uuid

SCHEME_CODE = "rakuten_account_type"
SCHEME_NAME = "口座区分"

VALUES: list[tuple[str, str, int]] = [
    ("tokutei", "特定", 1),
    ("general", "一般", 2),
    ("wrap", "楽ラップ", 3),
]

ACCOUNT_ID_TO_VALUE_CODE = {
    "rakuten:特定": "tokutei",
    "rakuten:一般": "general",
    "rakuten:ラップ": "wrap",
}


def main() -> int:
    result = 0
    root = pathlib.Path(__file__).resolve().parents[3]
    db_path = root / "data" / "portfolio.db"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    portfolio = cur.execute(
        "SELECT id FROM portfolios WHERE code = 'rakuten'"
    ).fetchone()
    if portfolio is None:
        raise RuntimeError("rakuten portfolio is not found")
    portfolio_id = portfolio[0]

    snapshot = cur.execute(
        """
        SELECT id FROM portfolio_snapshots
        WHERE portfolio_id = ?
        ORDER BY as_of_date DESC, created_at DESC
        LIMIT 1
        """,
        (portfolio_id,),
    ).fetchone()
    if snapshot is None:
        raise RuntimeError("rakuten snapshot is not found")
    snapshot_id = snapshot[0]

    scheme_row = cur.execute(
        """
        SELECT id FROM classification_schemes
        WHERE portfolio_id = ? AND code = ?
        """,
        (portfolio_id, SCHEME_CODE),
    ).fetchone()

    scheme_created = False
    if scheme_row is None:
        scheme_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO classification_schemes (id, portfolio_id, code, name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (scheme_id, portfolio_id, SCHEME_CODE, SCHEME_NAME, now),
        )
        scheme_created = True
    else:
        scheme_id = scheme_row[0]

    value_ids: dict[str, str] = {}
    values_created = 0
    for code, name, sort_order in VALUES:
        existing = cur.execute(
            """
            SELECT id FROM classification_values
            WHERE scheme_id = ? AND code = ?
            """,
            (scheme_id, code),
        ).fetchone()
        if existing is None:
            value_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO classification_values (
                  id, scheme_id, code, name, sort_order, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (value_id, scheme_id, code, name, sort_order, now),
            )
            values_created += 1
            value_ids[code] = value_id
            continue

        value_ids[code] = existing[0]

    line_rows = cur.execute(
        """
        SELECT instrument_id, account_id, market_value_minor
        FROM holding_lines
        WHERE snapshot_id = ?
        """,
        (snapshot_id,),
    ).fetchall()

    # instrument_id -> value_code -> market_value sum
    market_by_instrument: dict[str, dict[str, int]] = {}
    for instrument_id, account_id, market_value_minor in line_rows:
        value_code = ACCOUNT_ID_TO_VALUE_CODE.get(account_id)
        if value_code is None:
            continue
        by_value = market_by_instrument.setdefault(instrument_id, {})
        by_value[value_code] = by_value.get(value_code, 0) + int(market_value_minor)

    tags_created = 0
    tags_updated = 0
    tags_skipped = 0
    by_value: dict[str, int] = {code: 0 for code, _, _ in VALUES}
    multi_tag_instruments = 0

    for instrument_id, value_markets in market_by_instrument.items():
        total_market = sum(value_markets.values())
        if total_market <= 0:
            continue

        if len(value_markets) > 1:
            multi_tag_instruments += 1

        for value_code, market_value in value_markets.items():
            value_id = value_ids[value_code]
            weight = None
            if len(value_markets) > 1:
                weight = market_value / total_market

            existing = cur.execute(
                """
                SELECT allocation_weight FROM instrument_classifications
                WHERE instrument_id = ? AND classification_value_id = ?
                """,
                (instrument_id, value_id),
            ).fetchone()

            if existing is None:
                cur.execute(
                    """
                    INSERT INTO instrument_classifications (
                      instrument_id, classification_value_id, allocation_weight
                    )
                    VALUES (?, ?, ?)
                    """,
                    (instrument_id, value_id, weight),
                )
                tags_created += 1
                by_value[value_code] += 1
                continue

            existing_weight = existing[0]
            same_weight = (existing_weight is None and weight is None) or (
                existing_weight is not None
                and weight is not None
                and abs(float(existing_weight) - weight) < 1e-12
            )
            if same_weight:
                tags_skipped += 1
                by_value[value_code] += 1
                continue

            cur.execute(
                """
                UPDATE instrument_classifications
                SET allocation_weight = ?
                WHERE instrument_id = ? AND classification_value_id = ?
                """,
                (weight, instrument_id, value_id),
            )
            tags_updated += 1
            by_value[value_code] += 1

    con.commit()

    print("scheme_id:", scheme_id)
    print("scheme_created:", scheme_created)
    print("values_created:", values_created)
    print("instruments_from_lines:", len(market_by_instrument))
    print("multi_tag_instruments:", multi_tag_instruments)
    print("tags_created:", tags_created)
    print("tags_updated:", tags_updated)
    print("tags_skipped:", tags_skipped)
    print("by_value:")
    for code, name, _ in VALUES:
        print(f"  {code} ({name}): {by_value[code]}")

    con.close()
    return result


if __name__ == "__main__":
    raise SystemExit(main())
