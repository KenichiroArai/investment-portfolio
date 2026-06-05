-- iDeCo 明細 CSV 相当の保有明細一覧（全列）
-- holding_line_metrics の code は iDeCo 投入時の慣例。DB スキーマ自体は口座非依存。
--
-- | CSV 列               | 参照先                                              |
-- |----------------------|-----------------------------------------------------|
-- | 番号                 | holding_lines.sort_order                            |
-- | 日付                 | portfolio_snapshots.as_of_date                      |
-- | 商品タイプ           | classification_values.name                          |
-- | 運用商品名           | instruments.name                                    |
-- | 時価単価(1万口当り)  | metrics: unit_price_per_10k_lots                    |
-- | 残高数量             | holding_lines.quantity                              |
-- | 資産残高             | holding_lines.market_value_minor（千円表示は /1000）|
-- | 購入金額             | holding_lines.book_value_minor（千円表示は /1000）  |
-- | 損益                 | metrics: unrealized_gain_minor（千円表示は /1000）  |
-- | 損益率               | metrics: unrealized_gain_rate（小数 → % 表示）      |

SELECT
  hl.sort_order AS "番号",
  ps.as_of_date AS "日付",
  cv.name AS "商品タイプ",
  i.name AS "運用商品名",
  unit_price.integer_value AS "時価単価(1万口当り)",
  hl.quantity AS "残高数量",
  hl.market_value_minor / 1000 AS "資産残高_千円",
  hl.book_value_minor / 1000 AS "購入金額_千円",
  gain.integer_value / 1000 AS "損益_千円",
  printf('%.1f%%', gain_rate.real_value * 100) AS "損益率"
FROM portfolios p
JOIN portfolio_snapshots ps ON ps.portfolio_id = p.id AND ps.is_current = 1
JOIN holding_lines hl ON hl.snapshot_id = ps.id
JOIN instruments i ON i.id = hl.instrument_id
LEFT JOIN instrument_classifications ic ON ic.instrument_id = i.id
LEFT JOIN classification_values cv ON cv.id = ic.classification_value_id
LEFT JOIN classification_schemes cs ON cs.id = cv.scheme_id AND cs.code = 'ideco_product_type'
LEFT JOIN holding_line_metrics unit_price
  ON unit_price.holding_line_id = hl.id AND unit_price.code = 'unit_price_per_10k_lots'
LEFT JOIN holding_line_metrics gain
  ON gain.holding_line_id = hl.id AND gain.code = 'unrealized_gain_minor'
LEFT JOIN holding_line_metrics gain_rate
  ON gain_rate.holding_line_id = hl.id AND gain_rate.code = 'unrealized_gain_rate'
WHERE p.code = 'ideco'
ORDER BY hl.sort_order;
