-- ideco / monex で instrument_id が共有されている銘柄を確認する
WITH usage AS (
  SELECT
    i.id AS instrument_id,
    i.name AS instrument_name,
    p.code AS portfolio_code
  FROM instruments i
  JOIN holding_lines hl ON hl.instrument_id = i.id
  JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
  JOIN portfolios p ON p.id = ps.portfolio_id
  WHERE p.code IN ("ideco", "monex")
  GROUP BY i.id, i.name, p.code
)
SELECT
  instrument_id,
  instrument_name,
  GROUP_CONCAT(portfolio_code, ",") AS used_in_portfolios
FROM usage
GROUP BY instrument_id, instrument_name
HAVING COUNT(*) > 1
ORDER BY instrument_name;
