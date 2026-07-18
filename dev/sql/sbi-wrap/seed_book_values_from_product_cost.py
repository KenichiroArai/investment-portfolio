"""一時投入: sbi-wrap 最新スナップショットに商品ごと購入金額を銘柄評価額比率で按分する。

各 account_id（AI投資など）に PRODUCT_COST_MINOR 円を割り当て、
同一商品内の holding_lines へ評価額比率で book_value_minor を書き、
unrealized_gain_minor / unrealized_gain_rate を upsert する。

実行:
  python dev/sql/sbi-wrap/seed_book_values_from_product_cost.py
"""

from __future__ import annotations

import pathlib
import sqlite3
import uuid
from collections import defaultdict

PRODUCT_COST_MINOR = 10_000

GAIN_MINOR_CODE = "unrealized_gain_minor"
GAIN_RATE_CODE = "unrealized_gain_rate"


def distribute_amount_proportionally(
    weights: list[tuple[str, int]],
    amount_minor: int,
) -> dict[str, int]:
    """packages/shared distributeAmountProportionally と同型（最後の行で端数調整）。"""
    result: dict[str, int] = {}

    if amount_minor == 0 or len(weights) == 0:
        return result

    total_weight = sum(weight for _, weight in weights)
    if total_weight <= 0:
        return result

    absolute_amount = abs(amount_minor)
    sign = 1 if amount_minor > 0 else -1
    allocated = 0

    for index, (key, weight) in enumerate(weights):
        if index == len(weights) - 1:
            result[key] = sign * (absolute_amount - allocated)
            continue

        share = round((weight / total_weight) * absolute_amount)
        result[key] = sign * share
        allocated += share

    return result


def upsert_metric(
    cur: sqlite3.Cursor,
    holding_line_id: str,
    code: str,
    *,
    integer_value: int | None = None,
    real_value: float | None = None,
) -> None:
    existing = cur.execute(
        """
        SELECT id FROM holding_line_metrics
        WHERE holding_line_id = ? AND code = ?
        """,
        (holding_line_id, code),
    ).fetchone()

    if existing is None:
        cur.execute(
            """
            INSERT INTO holding_line_metrics (
              id, holding_line_id, code, integer_value, real_value, text_value
            )
            VALUES (?, ?, ?, ?, ?, NULL)
            """,
            (str(uuid.uuid4()), holding_line_id, code, integer_value, real_value),
        )
        return

    cur.execute(
        """
        UPDATE holding_line_metrics
        SET integer_value = ?, real_value = ?, text_value = NULL
        WHERE id = ?
        """,
        (integer_value, real_value, existing[0]),
    )


def main() -> int:
    result = 0
    root = pathlib.Path(__file__).resolve().parents[3]
    db_path = root / "data" / "portfolio.db"

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
        SELECT id, as_of_date FROM portfolio_snapshots
        WHERE portfolio_id = ?
        ORDER BY as_of_date DESC, created_at DESC
        LIMIT 1
        """,
        (portfolio_id,),
    ).fetchone()
    if snapshot is None:
        raise RuntimeError("sbi-wrap snapshot is not found")

    snapshot_id, as_of_date = snapshot

    lines = cur.execute(
        """
        SELECT id, account_id, market_value_minor, sort_order
        FROM holding_lines
        WHERE snapshot_id = ?
        ORDER BY account_id, sort_order, id
        """,
        (snapshot_id,),
    ).fetchall()

    if len(lines) == 0:
        raise RuntimeError("sbi-wrap holding_lines are empty")

    by_account: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for line_id, account_id, market_value_minor, _sort_order in lines:
        by_account[account_id].append((line_id, int(market_value_minor)))

    updated_lines = 0
    product_totals: dict[str, int] = {}

    for account_id, account_lines in by_account.items():
        book_by_line = distribute_amount_proportionally(
            account_lines,
            PRODUCT_COST_MINOR,
        )
        product_totals[account_id] = sum(book_by_line.values())

        market_by_line = {line_id: market for line_id, market in account_lines}

        for line_id, book_value_minor in book_by_line.items():
            market_value_minor = market_by_line[line_id]
            gain_minor = market_value_minor - book_value_minor
            gain_rate: float | None = None
            if book_value_minor != 0:
                gain_rate = gain_minor / book_value_minor

            cur.execute(
                """
                UPDATE holding_lines
                SET book_value_minor = ?
                WHERE id = ?
                """,
                (book_value_minor, line_id),
            )
            upsert_metric(
                cur,
                line_id,
                GAIN_MINOR_CODE,
                integer_value=gain_minor,
            )
            upsert_metric(
                cur,
                line_id,
                GAIN_RATE_CODE,
                real_value=gain_rate,
            )
            updated_lines += 1

    con.commit()

    print("snapshot_id:", snapshot_id)
    print("as_of_date:", as_of_date)
    print("product_cost_minor:", PRODUCT_COST_MINOR)
    print("updated_lines:", updated_lines)
    print("book_total_by_account:")
    for account_id in sorted(product_totals.keys()):
        print(f"  {account_id}: {product_totals[account_id]}")
    print("portfolio_book_total:", sum(product_totals.values()))

    con.close()
    return result


if __name__ == "__main__":
    raise SystemExit(main())
