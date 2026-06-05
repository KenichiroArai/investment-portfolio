-- 銘柄名で 1 行を突合（CSV 1 行目の例）
-- 運用商品名は下記 WHERE を実際の銘柄に合わせて変更してください。

SELECT
  hl.sort_order,
  i.name,
  hl.quantity,
  hl.market_value_minor,
  hl.book_value_minor,
  cv.name AS product_type,
  unit_price.integer_value AS unit_price_per_10k_lots,
  gain.integer_value AS unrealized_gain_minor,
  gain_rate.real_value AS unrealized_gain_rate
FROM portfolios p
JOIN portfolio_snapshots ps ON ps.portfolio_id = p.id AND ps.is_current = 1
JOIN holding_lines hl ON hl.snapshot_id = ps.id
JOIN instruments i ON i.id = hl.instrument_id
LEFT JOIN instrument_classifications ic ON ic.instrument_id = i.id
LEFT JOIN classification_values cv ON cv.id = ic.classification_value_id
LEFT JOIN holding_line_metrics unit_price
  ON unit_price.holding_line_id = hl.id AND unit_price.code = 'unit_price_per_10k_lots'
LEFT JOIN holding_line_metrics gain
  ON gain.holding_line_id = hl.id AND gain.code = 'unrealized_gain_minor'
LEFT JOIN holding_line_metrics gain_rate
  ON gain_rate.holding_line_id = hl.id AND gain_rate.code = 'unrealized_gain_rate'
WHERE p.code = 'ideco'
  AND i.name = 'eMAXIS Slim 国内株式(TOPIX)';
