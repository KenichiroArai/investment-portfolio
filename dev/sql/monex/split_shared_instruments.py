import datetime
import json
import pathlib
import sqlite3
import uuid


def main() -> int:
    result = 0
    root = pathlib.Path(__file__).resolve().parents[3]
    db_path = root / "data" / "portfolio.db"
    output_path = root / "dev" / "sql" / "monex" / "split-shared-instruments-log.json"
    now = datetime.datetime.now().isoformat(timespec="seconds")

    con = sqlite3.connect(db_path)
    con.execute("PRAGMA foreign_keys = ON")
    cur = con.cursor()

    ideco_portfolio_id = cur.execute(
        "SELECT id FROM portfolios WHERE code = 'ideco'"
    ).fetchone()
    if ideco_portfolio_id is None:
        raise RuntimeError("ideco portfolio is not found")
    ideco_portfolio_id_value = ideco_portfolio_id[0]

    shared_instruments = cur.execute(
        """
        WITH usage AS (
          SELECT hl.instrument_id, p.code AS portfolio_code
          FROM holding_lines hl
          JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
          JOIN portfolios p ON p.id = ps.portfolio_id
          WHERE p.code IN ('ideco', 'monex')
          GROUP BY hl.instrument_id, p.code
        )
        SELECT instrument_id
        FROM usage
        GROUP BY instrument_id
        HAVING COUNT(*) > 1
        """
    ).fetchall()

    mappings = []
    con.execute("BEGIN")
    for (old_instrument_id,) in shared_instruments:
        instrument_row = cur.execute(
            """
            SELECT name, instrument_type, currency, external_id
            FROM instruments
            WHERE id = ?
            """,
            (old_instrument_id,),
        ).fetchone()
        if instrument_row is None:
            raise RuntimeError(f"instrument not found: {old_instrument_id}")

        new_instrument_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO instruments (id, name, instrument_type, currency, external_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                new_instrument_id,
                instrument_row[0],
                instrument_row[1],
                instrument_row[2],
                instrument_row[3],
                now,
            ),
        )

        attributes = cur.execute(
            """
            SELECT code, integer_value, real_value, text_value
            FROM instrument_attributes
            WHERE instrument_id = ?
            """,
            (old_instrument_id,),
        ).fetchall()
        for code, integer_value, real_value, text_value in attributes:
            cur.execute(
                """
                INSERT INTO instrument_attributes (
                  id, instrument_id, code, integer_value, real_value, text_value
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    new_instrument_id,
                    code,
                    integer_value,
                    real_value,
                    text_value,
                ),
            )

        ideco_classification_ids = cur.execute(
            """
            SELECT ic.classification_value_id
            FROM instrument_classifications ic
            JOIN classification_values cv ON cv.id = ic.classification_value_id
            JOIN classification_schemes cs ON cs.id = cv.scheme_id
            WHERE ic.instrument_id = ?
              AND cs.portfolio_id = ?
            """,
            (old_instrument_id, ideco_portfolio_id_value),
        ).fetchall()
        for (classification_value_id,) in ideco_classification_ids:
            cur.execute(
                """
                INSERT INTO instrument_classifications (instrument_id, classification_value_id)
                VALUES (?, ?)
                """,
                (new_instrument_id, classification_value_id),
            )

        cur.execute(
            """
            UPDATE holding_lines
            SET instrument_id = ?
            WHERE instrument_id = ?
              AND snapshot_id IN (
                SELECT id
                FROM portfolio_snapshots
                WHERE portfolio_id = ?
              )
            """,
            (new_instrument_id, old_instrument_id, ideco_portfolio_id_value),
        )
        cur.execute(
            """
            UPDATE target_portfolio_weights
            SET instrument_id = ?
            WHERE portfolio_id = ?
              AND instrument_id = ?
            """,
            (new_instrument_id, ideco_portfolio_id_value, old_instrument_id),
        )

        mappings.append(
            {
                "old_instrument_id": old_instrument_id,
                "new_ideco_instrument_id": new_instrument_id,
                "name": instrument_row[0],
                "copied_attribute_count": len(attributes),
                "copied_ideco_classification_count": len(ideco_classification_ids),
            }
        )

    con.commit()
    con.close()

    output = {"executed_at": now, "count": len(mappings), "mappings": mappings}
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"split_count": len(mappings)}, ensure_ascii=False))
    return result


if __name__ == "__main__":
    raise SystemExit(main())
