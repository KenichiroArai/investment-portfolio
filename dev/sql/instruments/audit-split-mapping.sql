-- 旧 instrument_id がどの口座・口座内アカウントに分割されるかを確認する
WITH usage_rows AS (
  SELECT DISTINCT
    hl.instrument_id AS old_instrument_id,
    ps.portfolio_id AS portfolio_id,
    p.code AS portfolio_code,
    hl.account_id AS account_id
  FROM holding_lines hl
  INNER JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
  INNER JOIN portfolios p ON p.id = ps.portfolio_id
  UNION
  SELECT DISTINCT
    tpw.instrument_id AS old_instrument_id,
    tpw.portfolio_id AS portfolio_id,
    p.code AS portfolio_code,
    p.code || ':unknown' AS account_id
  FROM target_portfolio_weights tpw
  INNER JOIN portfolios p ON p.id = tpw.portfolio_id
)
SELECT
  i.id AS old_instrument_id,
  i.name,
  i.instrument_type,
  i.currency,
  i.external_id,
  u.portfolio_code,
  u.account_id
FROM usage_rows u
INNER JOIN instruments i ON i.id = u.old_instrument_id
ORDER BY i.name, u.portfolio_code, u.account_id;
