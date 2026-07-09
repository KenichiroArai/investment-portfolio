-- ideco から参照されず、monex のみが参照している削除候補を確認する
WITH ideco_portfolio AS (
  SELECT id
  FROM portfolios
  WHERE code = "ideco"
),
monex_portfolio AS (
  SELECT id
  FROM portfolios
  WHERE code = "monex"
),
ideco_used AS (
  SELECT DISTINCT hl.instrument_id
  FROM holding_lines hl
  JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
  JOIN ideco_portfolio ip ON ip.id = ps.portfolio_id
),
monex_used AS (
  SELECT DISTINCT hl.instrument_id
  FROM holding_lines hl
  JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
  JOIN monex_portfolio mp ON mp.id = ps.portfolio_id
),
ideco_target_used AS (
  SELECT DISTINCT tpw.instrument_id
  FROM target_portfolio_weights tpw
  JOIN ideco_portfolio ip ON ip.id = tpw.portfolio_id
)
SELECT
  i.id AS instrument_id,
  i.name AS instrument_name
FROM instruments i
JOIN monex_used mu ON mu.instrument_id = i.id
LEFT JOIN ideco_used iu ON iu.instrument_id = i.id
LEFT JOIN ideco_target_used itu ON itu.instrument_id = i.id
WHERE
  iu.instrument_id IS NULL
  AND itu.instrument_id IS NULL
ORDER BY instrument_name;
