# データベーススキーマ（`@repo/db`）

SQLite（`data/portfolio.db`）の Drizzle スキーマ定義です。スキーマ定義コード（[`src/schema/index.ts`](src/schema/index.ts)）には各テーブル・カラムの**論理名**をコメントで記載しています。値の例や口座別 code 慣例は [dev/sql/ideco/README.md](../../dev/sql/ideco/README.md) を参照してください。

## 金額の単位

カラム名が `*Minor` で終わる整数列は**円**単位です（例: `market_value_minor = 130962` は ¥130,962）。

## テーブル一覧

| 論理名 | 物理名 | 概要 |
| --- | --- | --- |
| 口座 | `portfolios` | 投資口座マスタ |
| 銘柄 | `instruments` | 運用商品マスタ |
| 分類体系 | `classification_schemes` | 口座ごとの分類軸 |
| 分類値 | `classification_values` | 分類体系の選択肢 |
| 銘柄分類 | `instrument_classifications` | 銘柄と分類値の紐付け |
| 銘柄属性 | `instrument_attributes` | 銘柄ごとの可変属性（EAV） |
| ポートフォリオスナップショット | `portfolio_snapshots` | 基準日時点の保有状態 |
| 保有明細行 | `holding_lines` | スナップショット内の1銘柄分の保有 |
| 保有明細指標 | `holding_line_metrics` | 明細行ごとの可変指標（EAV） |
| スナップショット指標 | `portfolio_snapshot_metrics` | スナップショットごとの可変指標（EAV） |
| 目標配分 | `target_allocation_weights` | 口座×分類体系×分類値の目標構成比 |
| 銘柄目標配分 | `target_portfolio_weights` | 口座×銘柄の目標構成比 |

## カラム定義

### `portfolios`（口座）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 口座コード | `code` | text | NOT NULL |
| 口座名 | `name` | text | NOT NULL |
| 口座種別 | `kind` | text | NOT NULL |
| 作成日時 | `created_at` | text | NOT NULL |

### `instruments`（銘柄）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 銘柄名 | `name` | text | NOT NULL |
| 銘柄種別 | `instrument_type` | text | NOT NULL |
| 通貨 | `currency` | text | NOT NULL |
| 外部ID | `external_id` | text | NULL |
| 作成日時 | `created_at` | text | NOT NULL |

### `classification_schemes`（分類体系）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 口座ID | `portfolio_id` | text | NOT NULL |
| 体系コード | `code` | text | NOT NULL |
| 体系名 | `name` | text | NOT NULL |
| 作成日時 | `created_at` | text | NOT NULL |

### `classification_values`（分類値）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 分類体系ID | `scheme_id` | text | NOT NULL |
| 分類値コード | `code` | text | NOT NULL |
| 分類値名 | `name` | text | NOT NULL |
| 表示順 | `sort_order` | integer | NOT NULL |
| 作成日時 | `created_at` | text | NOT NULL |

### `instrument_classifications`（銘柄分類）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| 銘柄ID | `instrument_id` | text | NOT NULL |
| 分類値ID | `classification_value_id` | text | NOT NULL |

### `instrument_attributes`（銘柄属性）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 銘柄ID | `instrument_id` | text | NOT NULL |
| 属性コード | `code` | text | NOT NULL |
| 整数値 | `integer_value` | integer | NULL |
| 実数値 | `real_value` | real | NULL |
| 文字列値 | `text_value` | text | NULL |

銘柄ごとに `code` は一意です。口座非依存の EAV パターンで、口座別の意味付けは code 慣例で区別します。

### `portfolio_snapshots`（ポートフォリオスナップショット）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 口座ID | `portfolio_id` | text | NOT NULL |
| 基準日 | `as_of_date` | text | NOT NULL |
| 最新フラグ | `is_current` | integer | NOT NULL |
| 作成日時 | `created_at` | text | NOT NULL |

### `holding_lines`（保有明細行）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| スナップショットID | `snapshot_id` | text | NOT NULL |
| 銘柄ID | `instrument_id` | text | NOT NULL |
| 表示順 | `sort_order` | integer | NULL |
| 数量 | `quantity` | real | NOT NULL |
| 評価額 | `market_value_minor` | integer | NOT NULL |
| 簿価 | `book_value_minor` | integer | NULL |

### `holding_line_metrics`（保有明細指標）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 保有明細行ID | `holding_line_id` | text | NOT NULL |
| 指標コード | `code` | text | NOT NULL |
| 整数値 | `integer_value` | integer | NULL |
| 実数値 | `real_value` | real | NULL |
| 文字列値 | `text_value` | text | NULL |

### `portfolio_snapshot_metrics`（スナップショット指標）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| スナップショットID | `snapshot_id` | text | NOT NULL |
| 指標コード | `code` | text | NOT NULL |
| 整数値 | `integer_value` | integer | NULL |
| 実数値 | `real_value` | real | NULL |
| 文字列値 | `text_value` | text | NULL |

スナップショットごとに `code` は一意です。口座非依存の EAV パターンで、口座別の意味付けは code 慣例で区別します。

### `target_allocation_weights`（目標配分）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 口座ID | `portfolio_id` | text | NOT NULL |
| 分類体系コード | `scheme_code` | text | NOT NULL |
| 分類値コード | `value_code` | text | NOT NULL |
| 目標構成比 | `target_ratio` | real | NOT NULL |
| 更新日時 | `updated_at` | text | NOT NULL |

口座×分類体系×分類値の組み合わせは一意です。`target_ratio` は 0〜1 の実数（例: `0.6` = 60%）。

### `target_portfolio_weights`（銘柄目標配分）

| 論理名 | 物理名 | 型 | NULL |
| --- | --- | --- | --- |
| ID | `id` | text | NOT NULL |
| 口座ID | `portfolio_id` | text | NOT NULL |
| 銘柄ID | `instrument_id` | text | NOT NULL |
| 目標構成比 | `target_ratio` | real | NOT NULL |
| 更新日時 | `updated_at` | text | NOT NULL |

口座×銘柄の組み合わせは一意です。ポートフォリオ配分・リバランス（銘柄軸）で使用します。

## 口座別ドキュメント

| 口座 | ドキュメント |
| --- | --- |
| iDeCo | [dev/sql/ideco/README.md](../../dev/sql/ideco/README.md) |

## マイグレーション

```bash
npm run db:migrate
```

## GitHub Pages エクスポート

```bash
npm run pages:export
```

SQLite の内容を `docs/data/` 以下の JSON に書き出します。詳細は [docs/README.md](../../docs/README.md) を参照してください。
