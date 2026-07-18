"""一時投入: sbi-wrap の「商品」分類ごとに銘柄単位の分析軸を作成する。

実行:
  python dev/sql/sbi-wrap/seed_product_instrument_axes.py

各商品（AI投資など）を独立した分析軸とし、該当 account_id の銘柄だけを
銘柄名の分類値としてタグ付けする。
"""

from __future__ import annotations

import datetime
import pathlib
import sqlite3
import uuid

PRODUCT_AXES: list[tuple[str, str, str]] = [
    ("sbi_wrap_ai_investment", "AI投資", "sbi-wrap:AI投資"),
    ("sbi_wrap_takumi", "匠の運用", "sbi-wrap:匠の運用"),
    ("sbi_wrap_rebanavi", "レバナビ", "sbi-wrap:レバナビ"),
    ("sbi_wrap_reba_choice", "レバチョイス", "sbi-wrap:レバチョイス"),
    ("sbi_wrap_all_equity", "ALL株式", "sbi-wrap:ALL株式"),
]


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
    snapshot_id = snapshot[0] if snapshot is not None else None

    sort_order_by_instrument: dict[str, int] = {}
    if snapshot_id is not None:
        for instrument_id, sort_order in cur.execute(
            """
            SELECT instrument_id, sort_order
            FROM holding_lines
            WHERE snapshot_id = ?
            """,
            (snapshot_id,),
        ):
            if instrument_id not in sort_order_by_instrument:
                sort_order_by_instrument[instrument_id] = sort_order

    schemes_created = 0
    values_created = 0
    tags_created = 0
    tags_skipped = 0
    by_scheme: dict[str, int] = {}

    for scheme_code, scheme_name, account_id in PRODUCT_AXES:
        scheme_row = cur.execute(
            """
            SELECT id FROM classification_schemes
            WHERE portfolio_id = ? AND code = ?
            """,
            (portfolio_id, scheme_code),
        ).fetchone()

        if scheme_row is None:
            scheme_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO classification_schemes (
                  id, portfolio_id, code, name, created_at
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (scheme_id, portfolio_id, scheme_code, scheme_name, now),
            )
            schemes_created += 1
        else:
            scheme_id = scheme_row[0]

        instruments = cur.execute(
            """
            SELECT id, name
            FROM instruments
            WHERE portfolio_id = ? AND account_id = ?
            ORDER BY name
            """,
            (portfolio_id, account_id),
        ).fetchall()

        instruments_sorted = sorted(
            instruments,
            key=lambda row: (
                sort_order_by_instrument.get(row[0], 10_000),
                row[1],
            ),
        )

        tagged_count = 0
        for index, (instrument_id, instrument_name) in enumerate(
            instruments_sorted, start=1
        ):
            sort_order = sort_order_by_instrument.get(instrument_id, index)
            value_code = instrument_id

            existing_value = cur.execute(
                """
                SELECT id FROM classification_values
                WHERE scheme_id = ? AND code = ?
                """,
                (scheme_id, value_code),
            ).fetchone()

            if existing_value is None:
                value_id = str(uuid.uuid4())
                cur.execute(
                    """
                    INSERT INTO classification_values (
                      id, scheme_id, code, name, sort_order, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        value_id,
                        scheme_id,
                        value_code,
                        instrument_name,
                        sort_order,
                        now,
                    ),
                )
                values_created += 1
            else:
                value_id = existing_value[0]

            existing_tag = cur.execute(
                """
                SELECT 1 FROM instrument_classifications
                WHERE instrument_id = ? AND classification_value_id = ?
                """,
                (instrument_id, value_id),
            ).fetchone()

            if existing_tag is not None:
                tags_skipped += 1
                tagged_count += 1
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
            tagged_count += 1

        by_scheme[scheme_code] = tagged_count

    con.commit()

    print("schemes_created:", schemes_created)
    print("values_created:", values_created)
    print("tags_created:", tags_created)
    print("tags_skipped:", tags_skipped)
    print("by_scheme:")
    for scheme_code, scheme_name, _ in PRODUCT_AXES:
        print(f"  {scheme_code} ({scheme_name}): {by_scheme[scheme_code]}")

    con.close()
    return result


if __name__ == "__main__":
    raise SystemExit(main())
