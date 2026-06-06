# 参照用 SQL（`dev/sql/`）

SQLite（`data/portfolio.db`）の内容を確認する SQL を口座・用途別に置いています。アプリや CI からは実行されません。

親フォルダの説明は [dev/README.md](../README.md) を参照してください。テーブル論理名は [packages/db/README.md](../../packages/db/README.md) を参照してください。

## 前提

- マイグレーション済み: `npm run db:migrate`
- DB ファイル: リポジトリルートの `data/portfolio.db`（環境変数 `DATABASE_PATH` で変更可能）

## フォルダ構成

```text
dev/sql/
├── README.md                 # 本ファイル
└── ideco/                    # iDeCo 口座
    ├── README.md             # CSV 対応・code 慣例
    ├── import-summary.sql
    ├── holdings-snapshot.sql
    └── instrument-lookup.sql
```

## iDeCo（4 CSV ディレクトリ投入）

投入元は `data/imports/ideco/` 以下の4 CSV です（`data/` は git 無視）。

```bash
npm run db:import:ideco -- data/imports/ideco
```

詳細は [ideco/README.md](ideco/README.md) を参照してください。

| ファイル | 用途 |
| --- | --- |
| [ideco/import-summary.sql](ideco/import-summary.sql) | 基準日・明細行数の概要 |
| [ideco/holdings-snapshot.sql](ideco/holdings-snapshot.sql) | 明細・銘柄属性・分類を含む一覧 |
| [ideco/instrument-lookup.sql](ideco/instrument-lookup.sql) | 銘柄名 1 件の突合（WHERE を編集） |

### 実行例（sqlite3 CLI）

リポジトリルートで:

```bash
sqlite3 data/portfolio.db < dev/sql/ideco/import-summary.sql
sqlite3 data/portfolio.db < dev/sql/ideco/holdings-snapshot.sql
```

Windows で `sqlite3` が PATH にない場合は、DB クライアント（DBeaver、VS Code 拡張など）で各 `.sql` を開いて実行してください。

## 今後

NISA や特定口座向けの確認 SQL が増えたら、同様に `dev/sql/<口座コード>/` 以下へ追加します。
