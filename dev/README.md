# 開発者向け資料（`dev/`）

ローカル開発・DB 確認用の資料を置きます。GitHub Pages 公開用の [`docs/`](../docs/) やアプリ本体（`apps/`）とは別管理です。CI や本番ビルドからは参照されません。

## 構成

| パス | 内容 |
| --- | --- |
| [../packages/db/README.md](../packages/db/README.md) | DB スキーマ論理名・テーブル定義 |
| [sql/README.md](sql/README.md) | SQLite 確認用 SQL（口座別） |
| [sql/ideco/README.md](sql/ideco/README.md) | iDeCo CSV 対応・code 慣例 |
| [../apps/web/src/features/README.md](../apps/web/src/features/README.md) | Web 画面機能のモジュール構成 |

今後、開発手順メモやスクリプトなども必要に応じて `dev/` 以下へ追加します。
