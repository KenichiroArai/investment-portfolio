# 楽天証券（rakuten）データモデル

楽天証券口座（`portfolios.code = 'rakuten'` / `kind = 'rakuten'`）向けの DB 格納慣例です。テーブル論理名は [packages/db/README.md](../../../packages/db/README.md) を参照してください。

## 口座 ID（`holding_lines.account_id`）

| account_id | 表示名 | 由来 |
| --- | --- | --- |
| `rakuten:特定` | 特定 | 貼り付けの口座区分「特定」 |
| `rakuten:一般` | 一般 | 貼り付けの口座区分「一般」 |
| `rakuten:ラップ` | 楽ラップ | 楽ラップ明細（口座 `-`） |
| `rakuten:unknown` | 不明口座 | 区分不明 |

同一銘柄の特定・一般は **銘柄マスタも口座区分ごとに別登録**します（`instruments.account_id` と `external_id` で区別）。明細行の `account_id` も対応する区分になります。

国内株式の `external_id` 例: `4826__rakuten:特定` / `4826__rakuten:一般`（表示・突合用コードは `4826`）。

## 銘柄属性（`instrument_attributes`）

| attribute code | 説明 | 値の例 |
| --- | --- | --- |
| `ticker` | 国内株式の銘柄コード | `1489` / `452A` |

国内株式は `instruments.external_id` にも銘柄コードを格納します。

## 銘柄種別（`instruments.instrument_type`）

| instrument_type | 対象 |
| --- | --- |
| `equity` | 国内株式 |
| `mutual_fund` | 投資信託・マネーファンド・外貨建MMF・楽ラップ投信 |
| `bond` | 国内債券 |
| `cash` | 楽ラップ現金等 |

## 保有明細指標（`holding_line_metrics`）

| metric code | 説明 | 値の例 |
| --- | --- | --- |
| `unit_price_minor` | 現在値・基準価額（円） | `3329` |
| `avg_cost_minor` | 平均取得単価（円） | `3285` |
| `account_type` | 口座区分 | `一般` / `特定` / `ラップ` |
| `unrealized_gain_minor` | 評価損益（円） | `44` |
| `unrealized_gain_rate` | 評価損益率 | `0.0133` |

## 保有明細の列対応

| 貼り付け項目 | 保存先 |
| --- | --- |
| 銘柄名・銘柄コード | `instruments.name` / `external_id` |
| 保有数量（株・口・額面） | `holding_lines.quantity` |
| 時価評価額（円） | `holding_lines.market_value_minor` |
| 簿価（株式: 平均取得×株数、投信: 平均取得×口数/10000） | `holding_lines.book_value_minor` |
| 口座区分・単価・平均取得・損益 | `holding_line_metrics` |

## 分析軸（分類体系）

| scheme code | 軸名 | 用途 |
| --- | --- | --- |
| `rakuten_product_type` | 種別 | 貼り付けの「種別」（国内株式・投資信託など） |

分類値（`classification_values.code`）:

| code | name |
| --- | --- |
| `domestic_equity` | 国内株式 |
| `mutual_fund` | 投資信託 |
| `rakuten_money_fund` | 楽天・マネーファンド |
| `foreign_mmf` | 外貨建MMF |
| `domestic_bond` | 国内債券 |
| `rakuten_wrap` | 楽ラップ |

一時投入（既存銘柄へのタグ付け込み）:

```powershell
python dev/sql/rakuten/seed_product_type_classifications.py
```

冪等です。軸・分類値が既にあればスキップし、未タグの銘柄だけ追加します。

## データ投入

1. ホームで口座を追加: code `rakuten` / kind「楽天証券」 / name「楽天証券」
2. ローカル API 接続時に Web の設定画面（楽天証券一括取り込み）から、楽天証券サイトの保有残高ページの内容を貼り付けて取り込みます。

取り込み対象:

| 貼り付け種別 | 用途 |
| --- | --- |
| 国内株式 | 国内株式の保有明細 |
| 投資信託 | 投資信託の保有明細 |
| 楽天・マネーファンド | マネーファンド |
| 外貨建MMF | 外貨建 MMF（円建て評価額） |
| 国内債券 | 個人国債など |
| 楽ラップ | ラップ専用投信 |
| 楽ラップ / 現金等 | ラップ内現金 |
