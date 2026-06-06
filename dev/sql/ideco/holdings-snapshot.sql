-- iDeCo 明細 CSV 相当の保有明細一覧（属性・分類含む）
-- code 慣例は dev/sql/ideco/README.md を参照

SELECT
  hl.sort_order AS "番号",
  ps.as_of_date AS "日付",
  short_name.text_value AS "運用商品名(略称)",
  i.name AS "運用商品名",
  provider.text_value AS "提供・委託会社",
  product_type.value_name AS "商品タイプ",
  region.value_name AS "地域分類",
  asset_class.value_name AS "資産分類",
  unit_price.integer_value AS "時価単価(1万口当り)",
  hl.quantity AS "残高数量",
  hl.market_value_minor AS "資産残高_円",
  hl.book_value_minor AS "購入金額_円",
  gain.integer_value AS "損益_円",
  printf('%.1f%%', gain_rate.real_value * 100) AS "損益率"
FROM portfolios p
JOIN portfolio_snapshots ps ON ps.portfolio_id = p.id AND ps.is_current = 1
JOIN holding_lines hl ON hl.snapshot_id = ps.id
JOIN instruments i ON i.id = hl.instrument_id
LEFT JOIN instrument_attributes short_name
  ON short_name.instrument_id = i.id AND short_name.code = 'short_name'
LEFT JOIN instrument_attributes provider
  ON provider.instrument_id = i.id AND provider.code = 'provider'
LEFT JOIN instrument_classifications ic_pt ON ic_pt.instrument_id = i.id
LEFT JOIN classification_values product_type ON product_type.id = ic_pt.classification_value_id
LEFT JOIN classification_schemes cs_pt
  ON cs_pt.id = product_type.scheme_id AND cs_pt.code = 'ideco_product_type'
LEFT JOIN instrument_classifications ic_rg ON ic_rg.instrument_id = i.id
LEFT JOIN classification_values region ON region.id = ic_rg.classification_value_id
LEFT JOIN classification_schemes cs_rg
  ON cs_rg.id = region.scheme_id AND cs_rg.code = 'ideco_region'
LEFT JOIN instrument_classifications ic_ac ON ic_ac.instrument_id = i.id
LEFT JOIN classification_values asset_class ON asset_class.id = ic_ac.classification_value_id
LEFT JOIN classification_schemes cs_ac
  ON cs_ac.id = asset_class.scheme_id AND cs_ac.code = 'ideco_asset_class'
LEFT JOIN holding_line_metrics unit_price
  ON unit_price.holding_line_id = hl.id AND unit_price.code = 'unit_price_per_10k_lots'
LEFT JOIN holding_line_metrics gain
  ON gain.holding_line_id = hl.id AND gain.code = 'unrealized_gain_minor'
LEFT JOIN holding_line_metrics gain_rate
  ON gain_rate.holding_line_id = hl.id AND gain_rate.code = 'unrealized_gain_rate'
WHERE p.code = 'ideco'
ORDER BY hl.sort_order;
