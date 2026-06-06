# iDeCo データモデルと CSV 対応

iDeCo 口座（`portfolios.code = 'ideco'`）向けの CSV 投入・DB 格納の慣例です。テーブル論理名は [packages/db/README.md](../../../packages/db/README.md) を参照してください。

## 投入元 CSV（`data/imports/ideco/`）

| ファイル | 役割 | 投入順 |
| --- | --- | --- |
| `商品タイプ.csv` | 商品タイプのマスタ | 1 |
| `分析.csv` | 商品タイプ → 地域・資産の対応検証 | 2 |
| `銘柄の情報.csv` | 銘柄マスタ（属性・分類タグ） | 3 |
| `明細.csv` | 保有スナップショット | 4 |

投入コマンド:

```bash
npm run db:import:ideco -- data/imports/ideco
```

明細の「運用商品名」列は、まず `instruments.name`（フルネーム）で突合し、見つからない場合は略称（`instrument_attributes.code = short_name`）で突合します。

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

### 商品タイプ → 地域・資産の導出（分析.csv 相当）

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

| attribute code | 元列（銘柄の情報.csv） | 値の例 |
| --- | --- | --- |
| `short_name` | 運用商品名(略称) | `eMAXIS Slim 国内株式(TOPIX)` |
| `provider` | 提供・委託会社 | `三菱UFJアセットマネジメント` |
| `trust_fee_text` | 信託報酬（％）（税込） | `0.143以内` |
| `trust_reserve_text` | 信託財産保留額（％） | `0` |

## 保有明細指標（`holding_line_metrics`）

| metric code | 元列（明細.csv） | 値の例 |
| --- | --- | --- |
| `unit_price_per_10k_lots` | 時価単価(1万口当り) | `31351` |
| `unrealized_gain_minor` | 損益（千円→円） | `2638000`（CSV 2638 千円） |
| `unrealized_gain_rate` | 損益率 | `0.021`（2.1%） |

## 明細 CSV 列対応

| CSV 列 | 保存先 |
| --- | --- |
| 番号 | `holding_lines.sort_order` |
| 日付 | `portfolio_snapshots.as_of_date` |
| 運用商品名 | フルネームまたは略称で銘柄突合 → `holding_lines.instrument_id` |
| 時価単価(1万口当り) | metric `unit_price_per_10k_lots` |
| 残高数量 | `holding_lines.quantity` |
| 資産残高 | `holding_lines.market_value_minor`（千円→円×1000） |
| 購入金額 | `holding_lines.book_value_minor`（千円→円×1000） |
| 損益 | metric `unrealized_gain_minor` |
| 損益率 | metric `unrealized_gain_rate` |

## 参照 SQL

| ファイル | 用途 |
| --- | --- |
| [import-summary.sql](import-summary.sql) | 投入後概要 |
| [holdings-snapshot.sql](holdings-snapshot.sql) | 明細・銘柄属性・分類を含む一覧 |
| [instrument-lookup.sql](instrument-lookup.sql) | 銘柄名突合 |
