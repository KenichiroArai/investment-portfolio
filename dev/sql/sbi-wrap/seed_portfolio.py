"""一時投入: sbi-wrap 口座を portfolios に作成する。

実行:
  python dev/sql/sbi-wrap/seed_portfolio.py
"""

from __future__ import annotations

import datetime
import pathlib
import sqlite3
import uuid

PORTFOLIO_CODE = "sbi-wrap"
PORTFOLIO_NAME = "SBIラップ"
PORTFOLIO_KIND = "sbi-wrap"


def main() -> int:
    result = 0
    root = pathlib.Path(__file__).resolve().parents[3]
    db_path = root / "data" / "portfolio.db"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    existing = cur.execute(
        "SELECT id FROM portfolios WHERE code = ?",
        (PORTFOLIO_CODE,),
    ).fetchone()

    if existing is not None:
        print("portfolio already exists:", existing[0])
        con.close()
        return result

    portfolio_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO portfolios (id, code, name, kind, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (portfolio_id, PORTFOLIO_CODE, PORTFOLIO_NAME, PORTFOLIO_KIND, now),
    )
    con.commit()
    print("portfolio_id:", portfolio_id)
    print("code:", PORTFOLIO_CODE)
    print("name:", PORTFOLIO_NAME)
    print("kind:", PORTFOLIO_KIND)
    con.close()
    return result


if __name__ == "__main__":
    raise SystemExit(main())
