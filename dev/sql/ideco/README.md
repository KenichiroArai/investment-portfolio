# iDeCo データモデル

iDeCo 口座（`portfolios.code = 'ideco'`）向けの DB 格納慣例です。テーブル論理名は [packages/db/README.md](../../../packages/db/README.md) を参照してください。

銘柄突合は、まず `instruments.name`（フルネーム）で行い、見つからない場合は略称（`instrument_attributes.code = short_name`）で行います。

## 分類体系（`classification_schemes` / `classification_values`）

| scheme code | 体系名 | value code 例 | 表示名例 |
| --- | --- | --- | --- |
| `ideco_product_type` | 商品タイプ | `domestic_equity` | 国内株式 |
| `ideco_major_category` | 大分類 | `mutual_fund` | 投資信託 |
| `ideco_product_style` | 商品タイプ(スタイル) | `passive` | パッシブ |
| `ideco_instrument_status` | ステータス | `exclusion_pending` | 除外手続中 |
| `ideco_region` | 地域分類 | `domestic` | 国内 |
| `ideco_asset_class` | 資産分類 | `equity` | 株式 |

### 商品タイプ一覧（`ideco_product_type`）

| value code | 表示名 |
| --- | --- |
| `domestic_equity` | 国内株式 |
| `domestic_foreign_equity` | 内外株式 |
| `foreign_equity` | 海外株式 |
| `domestic_bond` | 国内債券 |
| `foreign_bond` | 海外債券 |
| `domestic_reit` | 国内不動産投信 |
| `foreign_reit` | 海外不動産投信 |
| `balanced` | 内外資産複合 |
| `domestic_other` | 国内その他資産 |
| `principal_protected` | 元本確保 |

### 商品タイプ → 地域・資産の導出

| 商品タイプ | 地域分類 | 資産分類 |
| --- | --- | --- |
| 国内株式 | 国内 | 株式 |
| 内外株式 | 内外 | 株式 |
| 海外株式 | 海外 | 株式 |
| 国内債券 | 国内 | 債券 |
| 海外債券 | 海外 | 債券 |
| 国内不動産投信 | 国内 | 不動産 |
| 海外不動産投信 | 海外 | 不動産 |
| 内外資産複合 | 内外 | 複合 |
| 国内その他資産 | 国内 | その他 |

`元本確保` は導出対象外です。

## 銘柄属性（`instrument_attributes`）

| attribute code | 説明 | 値の例 |
| --- | --- | --- |
| `short_name` | 運用商品名(略称) | `eMAXIS Slim 国内株式(TOPIX)` |
| `provider` | 提供・委託会社 | `三菱UFJアセットマネジメント` |
| `trust_fee_text` | 信託報酬（％）（税込） | `0.143以内` |
| `trust_reserve_text` | 信託財産保留額（％） | `0` |

## スナップショット指標（`portfolio_snapshot_metrics`）

| metric code | 説明 | 値の例 |
| --- | --- | --- |
| `ideco_total_contributions` | 拠出金累計 | `2716679` |

iDeCo では明細の購入金額合算では口座全体の拠出金累計を得られないため、口座レベル指標として別途登録します。

## 保有明細指標（`holding_line_metrics`）

| metric code | 説明 | 値の例 |
| --- | --- | --- |
| `unit_price_per_10k_lots` | 時価単価(1万口当り) | `31351` |
| `unrealized_gain_minor` | 損益（円） | `2638` |
| `unrealized_gain_rate` | 損益率 | `0.021`（2.1%） |

## 複数基準日のスナップショット

同一口座に **複数の基準日** のスナップショットを登録できます。再登録時は同一基準日のスナップショットが更新され、最大の基準日が `is_current = 1` になります。

## 保有明細の列対応

| 項目 | 保存先 |
| --- | --- |
| 番号 | `holding_lines.sort_order` |
| 基準日 | `portfolio_snapshots.as_of_date` |
| 運用商品名 | フルネームまたは略称で銘柄突合 → `holding_lines.instrument_id` |
| 時価単価(1万口当り) | metric `unit_price_per_10k_lots` |
| 残高数量 | `holding_lines.quantity` |
| 資産残高 | `holding_lines.market_value_minor`（円） |
| 購入金額 | `holding_lines.book_value_minor`（円） |
| 損益 | metric `unrealized_gain_minor` |
| 損益率 | metric `unrealized_gain_rate` |

## 参照 SQL

| ファイル | 用途 |
| --- | --- |
| [import-summary.sql](import-summary.sql) | データ投入後の概要 |
| [holdings-snapshot.sql](holdings-snapshot.sql) | 明細・銘柄属性・分類を含む一覧 |
| [instrument-lookup.sql](instrument-lookup.sql) | 銘柄名突合 |
