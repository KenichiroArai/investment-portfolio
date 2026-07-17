"""一時投入: sbi-wrap 口座に分析軸「商品」と分類値を作成し、明細の口座に合わせて銘柄へタグ付けする。

実行:
  python dev/sql/sbi-wrap/seed_product_classifications.py

明細の holding_lines.account_id を正とする。
"""

from __future__ import annotations

import datetime
import pathlib
import sqlite3
import uuid

SCHEME_CODE = "sbi_wrap_product"
SCHEME_NAME = "商品"

VALUES: list[tuple[str, str, int]] = [
    ("ai_investment", "AI投資", 1),
    ("takumi", "匠の運用", 2),
    ("rebanavi", "レバナビ", 3),
    ("reba_choice", "レバチョイス", 4),
    ("all_equity", "ALL株式", 5),
]

ACCOUNT_ID_TO_VALUE_CODE = {
    "sbi-wrap:AI投資": "ai_investment",
    "sbi-wrap:匠の運用": "takumi",
    "sbi-wrap:レバナビ": "rebanavi",
    "sbi-wrap:レバチョイス": "reba_choice",
    "sbi-wrap:ALL株式": "all_equity",
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
        "SELECT id FROM portfolios WHERE code = 'sbi-wrap'"
    ).fetchone()
    if portfolio is None:
        raise RuntimeError("sbi-wrap portfolio is not found")
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

    tags_created = 0
    tags_skipped = 0
    by_value: dict[str, int] = {code: 0 for code, _, _ in VALUES}

    if snapshot is not None:
        snapshot_id = snapshot[0]
        line_rows = cur.execute(
            """
            SELECT DISTINCT instrument_id, account_id
            FROM holding_lines
            WHERE snapshot_id = ?
            """,
            (snapshot_id,),
        ).fetchall()

        for instrument_id, account_id in line_rows:
            value_code = ACCOUNT_ID_TO_VALUE_CODE.get(account_id)
            if value_code is None:
                continue

            value_id = value_ids[value_code]
            existing = cur.execute(
                """
                SELECT 1 FROM instrument_classifications
                WHERE instrument_id = ? AND classification_value_id = ?
                """,
                (instrument_id, value_id),
            ).fetchone()

            if existing is not None:
                tags_skipped += 1
                by_value[value_code] += 1
                continue

            cur.execute(
                """
                INSERT INTO instrument_classifications (
                  instrument_id, classification_value_id, allocation_weight
                )
                VALUES (?, ?, NULL)
                """,
                (instrument_id, value_id),
            )
            tags_created += 1
            by_value[value_code] += 1

    con.commit()

    print("scheme_id:", scheme_id)
    print("scheme_created:", scheme_created)
    print("values_created:", values_created)
    print("tags_created:", tags_created)
    print("tags_skipped:", tags_skipped)
    print("by_value:")
    for code, name, _ in VALUES:
        print(f"  {code} ({name}): {by_value[code]}")

    con.close()
    return result


if __name__ == "__main__":
    raise SystemExit(main())
