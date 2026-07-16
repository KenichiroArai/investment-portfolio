"""一時投入: rakuten 口座に分析軸「種別」と分類値を作成し、既存銘柄へタグ付けする。

実行:
  python dev/sql/rakuten/seed_product_type_classifications.py
"""

from __future__ import annotations

import datetime
import pathlib
import sqlite3
import uuid

SCHEME_CODE = "rakuten_product_type"
SCHEME_NAME = "種別"

VALUES: list[tuple[str, str, int]] = [
    ("domestic_equity", "国内株式", 1),
    ("mutual_fund", "投資信託", 2),
    ("rakuten_money_fund", "楽天・マネーファンド", 3),
    ("foreign_mmf", "外貨建MMF", 4),
    ("domestic_bond", "国内債券", 5),
    ("rakuten_wrap", "楽ラップ", 6),
]


def resolve_value_code(
    instrument_type: str,
    name: str,
    account_id: str | None,
) -> str:
    result = "mutual_fund"

    if instrument_type == "equity":
        result = "domestic_equity"
        return result

    if instrument_type == "bond":
        result = "domestic_bond"
        return result

    if instrument_type == "cash":
        result = "rakuten_wrap"
        return result

    if "マネーファンド" in name:
        result = "rakuten_money_fund"
        return result

    if "MMF" in name or "米ドルファンド" in name:
        result = "foreign_mmf"
        return result

    if (
        "ラップ専用" in name
        or "ラップ向け" in name
        or account_id == "rakuten:ラップ"
    ):
        result = "rakuten_wrap"
        return result

    return result


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

    instruments = cur.execute(
        """
        SELECT id, name, instrument_type, account_id
        FROM instruments
        WHERE portfolio_id = ?
        ORDER BY instrument_type, name, account_id
        """,
        (portfolio_id,),
    ).fetchall()

    tags_created = 0
    tags_skipped = 0
    by_value: dict[str, int] = {code: 0 for code, _, _ in VALUES}

    for instrument_id, name, instrument_type, account_id in instruments:
        value_code = resolve_value_code(instrument_type, name, account_id)
        value_id = value_ids[value_code]
        existing_tag = cur.execute(
            """
            SELECT 1 FROM instrument_classifications
            WHERE instrument_id = ? AND classification_value_id = ?
            """,
            (instrument_id, value_id),
        ).fetchone()
        if existing_tag is not None:
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
    print("instruments:", len(instruments))
    print("tags_created:", tags_created)
    print("tags_skipped:", tags_skipped)
    print("by_value:")
    for code, name, _ in VALUES:
        print(f"  {code} ({name}): {by_value[code]}")

    con.close()
    return result


if __name__ == "__main__":
    raise SystemExit(main())
