-- 1) 口座境界をまたぐ同一 instrument_id 参照が残っていないこと
WITH usage AS (
  SELECT DISTINCT
    hl.instrument_id,
    ps.portfolio_id
  FROM holding_lines hl
  INNER JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
  UNION
  SELECT DISTINCT
    tpw.instrument_id,
    tpw.portfolio_id
  FROM target_portfolio_weights tpw
)
SELECT
  instrument_id,
  COUNT(*) AS portfolio_count
FROM usage
GROUP BY instrument_id
HAVING COUNT(*) > 1;

-- 2) 同一 (portfolio_id, account_id) 内で name/type/currency/external_id が重複していないこと
SELECT
  portfolio_id,
  account_id,
  name,
  instrument_type,
  currency,
  coalesce(external_id, '') AS external_id_key,
  COUNT(*) AS duplicate_count
FROM instruments
GROUP BY portfolio_id, account_id, name, instrument_type, currency, coalesce(external_id, '')
HAVING COUNT(*) > 1;

-- 3) orphan 参照が存在しないこと
SELECT hl.id AS holding_line_id, hl.instrument_id
FROM holding_lines hl
LEFT JOIN instruments i ON i.id = hl.instrument_id
WHERE i.id IS NULL;

SELECT tpw.id AS target_weight_id, tpw.instrument_id
FROM target_portfolio_weights tpw
LEFT JOIN instruments i ON i.id = tpw.instrument_id
WHERE i.id IS NULL;
