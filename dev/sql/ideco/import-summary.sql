-- iDeCo 明細 CSV 投入後の概要確認
-- 前提: npm run db:migrate および db:import:ideco 済み
-- DB 既定: data/portfolio.db（DATABASE_PATH で変更可）

SELECT
  p.code AS portfolio_code,
  p.name AS portfolio_name,
  ps.as_of_date,
  ps.is_current,
  COUNT(hl.id) AS line_count
FROM portfolios p
JOIN portfolio_snapshots ps ON ps.portfolio_id = p.id
LEFT JOIN holding_lines hl ON hl.snapshot_id = ps.id
WHERE p.code = 'ideco'
  AND ps.is_current = 1
GROUP BY p.id, ps.id;
