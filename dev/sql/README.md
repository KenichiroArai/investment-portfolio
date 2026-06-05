# 参照用 SQL（`dev/sql/`）

SQLite（`data/portfolio.db`）の内容を確認する SQL を口座・用途別に置いています。アプリや CI からは実行されません。

親フォルダの説明は [dev/README.md](../README.md) を参照してください。

## 前提

- マイグレーション済み: `npm run db:migrate`
- DB ファイル: リポジトリルートの `data/portfolio.db`（環境変数 `DATABASE_PATH` で変更可能）

## フォルダ構成

```text
dev/sql/
├── README.md                 # 本ファイル
└── ideco/                    # iDeCo 口座（明細 CSV 投入後の確認）
    ├── import-summary.sql
    ├── holdings-snapshot.sql
    └── instrument-lookup.sql
```

## iDeCo（明細 CSV）

投入元 CSV の正本は次のパスです（リポジトリ外）:

```text
D:\SVN\日常作業\trunk\記録\家計簿\家計簿.csv
```

ローカルには同内容のコピーを `data/imports/ideco/holdings.csv` に置きます（`data/` は git 無視）。

投入コマンド（ルート README 参照）:

```bash
npm run db:import:ideco -- "D:\SVN\日常作業\trunk\記録\家計簿\家計簿.csv"
```

ローカルコピーを使う場合:

```bash
npm run db:import:ideco -- data/imports/ideco/holdings.csv
```

| ファイル | 用途 |
| --- | --- |
| [ideco/import-summary.sql](ideco/import-summary.sql) | 基準日・明細行数の概要 |
| [ideco/holdings-snapshot.sql](ideco/holdings-snapshot.sql) | 明細 CSV 全列に相当する保有明細一覧 |
| [ideco/instrument-lookup.sql](ideco/instrument-lookup.sql) | 銘柄名 1 件の突合（WHERE を編集） |

### 実行例（sqlite3 CLI）

リポジトリルートで:

```bash
sqlite3 data/portfolio.db < dev/sql/ideco/import-summary.sql
sqlite3 data/portfolio.db < dev/sql/ideco/holdings-snapshot.sql
```

Windows で `sqlite3` が PATH にない場合は、DB クライアント（DBeaver、VS Code 拡張など）で各 `.sql` を開いて実行してください。

### CSV 列と DB の対応

明細 CSV（`番号,日付,商品タイプ,運用商品名,...` 形式）の列は次のように保存されます（`holding_line_metrics` の code は iDeCo 投入時の慣例で、テーブル自体は汎用です）。

| CSV 列 | 保存先 |
| --- | --- |
| 番号 | `holding_lines.sort_order` |
| 日付 | `portfolio_snapshots.as_of_date` |
| 商品タイプ | 分類タグ（`ideco_product_type`） |
| 運用商品名 | `instruments.name` |
| 時価単価(1万口当り) | metric `unit_price_per_10k_lots` |
| 残高数量 | `holding_lines.quantity` |
| 資産残高 | `holding_lines.market_value_minor`（千円→円×1000） |
| 購入金額 | `holding_lines.book_value_minor`（千円→円×1000） |
| 損益 | metric `unrealized_gain_minor` |
| 損益率 | metric `unrealized_gain_rate`（小数、例: 0.021 = 2.1%） |

## 今後

NISA や特定口座向けの確認 SQL が増えたら、同様に `dev/sql/<口座コード>/` 以下へ追加します。
