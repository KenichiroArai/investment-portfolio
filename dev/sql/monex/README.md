# マネックス証券（monex）データモデル

マネックス証券 ON COMPASS 口座（`portfolios.code = 'monex'`）向けの DB 格納慣例です。テーブル論理名は [packages/db/README.md](../../../packages/db/README.md) を参照してください。

## 分類体系（`classification_schemes` / `classification_values`）

| scheme code | 体系名 | value code 例 | 表示名例 |
| --- | --- | --- | --- |
| `monex_asset_class` | 資産クラス | `domestic_equity` | 国内株式 |
| | | `developed_equity` | 先進国株式 |
| | | `emerging_equity` | 新興国株式 |
| | | `other` | その他資産 |

資産クラスは ON COMPASS エクスポートの資産クラス別 CSV ファイル名から導出します（例: `先進国株式.csv` → `developed_equity`）。

## 銘柄属性（`instrument_attributes`）

| attribute code | 説明 | 値の例 |
| --- | --- | --- |
| `market` | 市場（米国株） | `米国` |
| `ticker` | ティッカー（米国株） | `JEPQ` |

米国株は `instruments.external_id` にティッカーを格納します。

## 保有明細指標（`holding_line_metrics`）

| metric code | 説明 | 値の例 |
| --- | --- | --- |
| `unit_price_minor` | 基準価額（円） | `9139` |
| `avg_cost_minor` | 平均取得単価（円） | `8584` |
| `account_type` | 口座区分 | `一般` / `特定` |
| `custody_type` | 預り区分 | `普通預り` / `保護` |
| `dividend_option` | 分配金の取扱い | `再投資コース（再投資中）` |
| `unrealized_gain_minor` | 評価損益（円） | `66` |
| `unrealized_gain_rate` | 評価損益率 | `0.0646` |

## 保有明細の列対応

| CSV 項目 | 保存先 |
| --- | --- |
| 銘柄 / ファンド名 / 銘柄名 | `instruments.name` |
| 保有数(口) / 保有株数 | `holding_lines.quantity` |
| 概算評価額(円) | `holding_lines.market_value_minor` |
| 平均取得単価 × 数量 | `holding_lines.book_value_minor` |
| 口座区分・預り区分・分配金 | `holding_line_metrics`（text） |
| 基準価額・平均取得単価 | `holding_line_metrics`（integer） |

## CSV インポート

```bash
npm run db:import:monex -- data/imports/monex
```

取り込み対象:

| ファイル | 用途 |
| --- | --- |
| `国内株等.csv` | 国内銘柄・投信の保有明細 |
| `米国株.csv` | 米国株の保有明細 |
| `ON COMPASS.csv` | ON COMPASS ファンド明細 |
| 資産クラス別 CSV | 銘柄の資産クラス分類タグ付け |

CSV は Shift_JIS（CP932）です。
