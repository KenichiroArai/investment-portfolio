# SBIラップ（sbi-wrap）データモデル

SBIラップ口座（`portfolios.code = 'sbi-wrap'` / `kind = 'sbi-wrap'`）向けの DB 格納慣例です。テーブル論理名は [packages/db/README.md](../../../packages/db/README.md) を参照してください。

## 口座の登録

設定 → 口座登録で次を作成します。

| 項目 | 値 |
| --- | --- |
| コード | `sbi-wrap` |
| 名称 | `SBIラップ` |
| 種別 | `sbi-wrap` |

または:

```powershell
python dev/sql/sbi-wrap/seed_portfolio.py
```

## 口座 ID（`holding_lines.account_id`）

各ラップ商品を口座内アカウントとして分けます（同一銘柄が複数商品に出るため）。

| account_id | 表示名 | 商品 |
| --- | --- | --- |
| `sbi-wrap:AI投資` | AI投資 | AI投資 |
| `sbi-wrap:匠の運用` | 匠の運用 | 匠の運用 |
| `sbi-wrap:レバナビ` | レバナビ | レバナビ |
| `sbi-wrap:レバチョイス` | レバチョイス | レバチョイス |
| `sbi-wrap:ALL株式` | ALL株式 | ALL株式 |

銘柄マスタも商品ごとに別登録します（`instruments.account_id` と `external_id` で区別）。

## 銘柄種別（`instruments.instrument_type`）

| instrument_type | 対象 |
| --- | --- |
| `mutual_fund` | ラップ専用ファンド |
| `cash` | 現金 |

## 保有明細指標（`holding_line_metrics`）

| metric code | 説明 | 値の例 |
| --- | --- | --- |
| `account_type` | 商品名 | `AI投資` / `レバナビ` |
| `unrealized_gain_minor` | 評価損益（円） | `market − book` |
| `unrealized_gain_rate` | 評価損益率 | `gain / book` |

## 保有明細の列対応

| 貼り付け項目 | 保存先 |
| --- | --- |
| 銘柄名 | `instruments.name` |
| 評価額（円） | `holding_lines.market_value_minor` |
| 商品（指紋判定） | `holding_lines.account_id` / `account_name` |
| 現金 | 銘柄「現金」、`instrument_type=cash` |
| マネーファンド（評価額 0） | 取り込み対象外 |

数量・単価が貼り付けに無いため、`quantity = 1`。貼り付け内訳に銘柄別の購入金額・損益は無い。

## 購入金額・損益（商品ごと按分）

資産残高貼り付けの商品ブロック先頭の通算損益から、各商品の購入金額は **10,000円**（残高 − 通算損益）とみなせる。銘柄別の損益は貼り付けに無いため、商品ごと 10,000円を同一 `account_id` 内の評価額比率で按分して `book_value_minor` と損益メトリクスを入れる。

```powershell
python dev/sql/sbi-wrap/seed_book_values_from_product_cost.py
```

按分後は `npm run pages:export` で静的 JSON を更新する。

## 貼り付け取込

設定 → データ管理 → 「SBIラップ一括取り込み」に、各商品の資産残高画面をまとめて貼り付けます。

商品名ヘッダが無いため、内訳銘柄の指紋で商品を判定します。

| 判定キー | 商品 |
| --- | --- |
| `（ラップ専用）ＳＢＩ・` | AI投資 |
| `世界株式アクティブ` / `セレクト・オポチュニティ` 等 | 匠の運用 |
| `マルチアセット` かつ トリプル評価額 ≤ シングル | レバナビ |
| `マルチアセット` かつ トリプル評価額 > シングル | レバチョイス |
| `三井住友ＤＳ` | ALL株式 |

## 分析軸（分類体系）

| scheme code | 軸名 | 用途 |
| --- | --- | --- |
| `sbi_wrap_product` | 商品 | ラップ商品（AI投資など） |
| `sbi_wrap_ai_investment` | AI投資 | AI投資内の銘柄構成 |
| `sbi_wrap_takumi` | 匠の運用 | 匠の運用内の銘柄構成 |
| `sbi_wrap_rebanavi` | レバナビ | レバナビ内の銘柄構成 |
| `sbi_wrap_reba_choice` | レバチョイス | レバチョイス内の銘柄構成 |
| `sbi_wrap_all_equity` | ALL株式 | ALL株式内の銘柄構成 |

### 商品（`sbi_wrap_product`）

| code | name | 明細 `account_id` |
| --- | --- | --- |
| `ai_investment` | AI投資 | `sbi-wrap:AI投資` |
| `takumi` | 匠の運用 | `sbi-wrap:匠の運用` |
| `rebanavi` | レバナビ | `sbi-wrap:レバナビ` |
| `reba_choice` | レバチョイス | `sbi-wrap:レバチョイス` |
| `all_equity` | ALL株式 | `sbi-wrap:ALL株式` |

一括取込で銘柄登録するときに分類も付与します。既存明細向けに再投入する場合:

```powershell
python dev/sql/sbi-wrap/seed_product_classifications.py
```

### 商品別銘柄軸（`sbi_wrap_ai_investment` など）

「商品」の各分類を独立した分析軸にし、該当 `account_id` の銘柄だけを銘柄名の分類値としてタグ付けします（分類値の `code` は `instruments.id`）。

```powershell
python dev/sql/sbi-wrap/seed_product_instrument_axes.py
```
