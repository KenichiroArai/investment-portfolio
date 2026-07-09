-- 1) 同一 portfolio 内で name/type/currency/external_id が重複していないこと
SELECT
  portfolio_id,
  name,
  instrument_type,
  currency,
  coalesce(external_id, '') AS external_id_key,
  COUNT(*) AS duplicate_count
FROM instruments
GROUP BY portfolio_id, name, instrument_type, currency, coalesce(external_id, '')
HAVING COUNT(*) > 1;

-- 2) orphan 参照が存在しないこと
SELECT hl.id AS holding_line_id, hl.instrument_id
FROM holding_lines hl
LEFT JOIN instruments i ON i.id = hl.instrument_id
WHERE i.id IS NULL;

SELECT tpw.id AS target_weight_id, tpw.instrument_id
FROM target_portfolio_weights tpw
LEFT JOIN instruments i ON i.id = tpw.instrument_id
WHERE i.id IS NULL;

-- 3) iDeCo 口座の holding_lines に monex:unknown が残っていないこと
SELECT hl.id, hl.account_id
FROM holding_lines hl
INNER JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
INNER JOIN portfolios p ON p.id = ps.portfolio_id
WHERE p.code = 'ideco'
  AND hl.account_id = 'monex:unknown';
