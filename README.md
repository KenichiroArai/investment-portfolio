# investment-portfolio

投資ポートフォリオの管理・分析を行うためのツールです。

## リポジトリ構成

npm workspaces のモノレポです。

```text
investment-portfolio/
├── apps/
│   ├── api/                 # ローカル Hono API
│   └── web/                 # Next.js（GitHub Pages、静的エクスポート）
├── packages/
│   ├── db/                  # スキーマ・リポジトリ・マイグレーション
│   ├── shared/              # DTO・Zod スキーマ
│   ├── tsconfig/
│   └── ui/
├── docs/                    # GitHub Pages 公開用データ（JSON 正本）
├── dev/                     # 開発者向け資料（DB 確認 SQL 等）
├── data/                    # ローカルデータ（SQLite・投入用 CSV、git 無視）
└── package.json
```

## 前提

- Node.js 22 推奨
- npm

## ローカル起動

```bash
npm install
npm run db:migrate
npm run dev:stop   # 前回の dev が残っているとき（任意）
npm run dev:all
```

- Web: [http://localhost:3000/](http://localhost:3000/)
- API: [http://127.0.0.1:3001/health](http://127.0.0.1:3001/health)

別ターミナルで起動する場合:

```bash
npm run dev:api
npm run dev
```

`dev:all` がすぐ終了する場合（ポート 3000 / 3001 が使用中など）は、別ターミナルの `dev:all` を `Ctrl+C` で止めてから次を実行してください。

```bash
npm run dev:stop
npm run dev:all
```

## データと環境変数

`data/` はローカル専用です（`.gitignore` で除外）。SQLite と投入用 CSV をまとめて置きます。

```text
data/
├── portfolio.db              # SQLite（migrate / import で生成）
└── imports/
    └── ideco/                # 5 CSV（商品タイプ・分析・銘柄の情報・明細・汎用）
```

環境変数（任意）:

- `DATABASE_PATH` — SQLite ファイル（既定: `data/portfolio.db`）
- `PORT` / `HOST` — API の待ち受け（既定: `127.0.0.1:3001`）
- `NEXT_PUBLIC_API_URL` — Web から参照する API（既定: `http://127.0.0.1:3001`）

- 開発時は Web がローカル API から明細を取得します。
- 本番（GitHub Pages）ビルドでは `docs/data/` の JSON を静的に読み込みます（登録・更新はローカルのみ）。

## iDeCo データ投入

iDeCo 口座のデータは `data/imports/ideco/` 以下の 5 CSV から SQLite へ一括投入します。CSV 対応の詳細は [dev/sql/ideco/README.md](dev/sql/ideco/README.md) を参照してください。

```bash
npm run db:import:ideco -- data/imports/ideco
```

`data/` 配下は個人データのため Git 管理しません。

投入内容:

- 口座 `ideco`（未作成なら自動作成）
- 分類体系（商品タイプ・大分類・スタイル・ステータス・地域・資産）と銘柄へのタグ付け
- 銘柄マスタ（属性: 略称・提供会社・信託報酬など）
- 最新明細（`asOfDate` は明細 CSV の日付列、金額は円のまま保存）
- 口座レベル指標（汎用 CSV の拠出金累計など）

SQLite の内容を SQL で確認する場合は [dev/sql/README.md](dev/sql/README.md) を参照してください。

## 動作確認

`npm run dev:all` で API と Web を起動したあと、次で確認できます。

### API（curl）

```bash
# 起動確認
curl -s http://127.0.0.1:3001/health

# 口座一覧（データ未投入なら []）
curl -s http://127.0.0.1:3001/portfolios

# 最新明細（ideco を投入済みの場合）
curl -s http://127.0.0.1:3001/portfolios/ideco/snapshot/current
```

`health` が JSON で返れば API は待ち受けできています。明細は [iDeCo データ投入](#ideco-データ投入) のあと `snapshot/current` で確認します。

### Web（ブラウザ）

| URL | 内容 |
| --- | --- |
| [http://localhost:3000/](http://localhost:3000/) | トップ（ハブ） |
| [http://localhost:3000/portfolios/ideco/holdings/](http://localhost:3000/portfolios/ideco/holdings/) | 口座明細（iDeCo） |

メニュー **口座明細（iDeCo）** からも同じ明細画面に遷移します。API が止まっている、または `NEXT_PUBLIC_API_URL` が実際の API と一致しない場合は画面上でエラーになります。

### 型チェック・テスト（起動不要）

```bash
npm run lint
npm test
npm run test:coverage
```

## GitHub Pages 公開

公開用 JSON の正本は [`docs/`](docs/) 以下のみです（詳細は [docs/README.md](docs/README.md)）。

1. [iDeCo データ投入](#ideco-データ投入) で SQLite にデータを投入する。
2. エクスポートする。

   ```bash
   npm run pages:export
   ```

3. `docs/data/` の変更をコミットして `main` に push する。
4. GitHub Actions がビルド時に `docs/data` を `apps/web/public/data` へ同期し、静的サイトをデプロイする（CI では SQLite に接続しません）。

初回のみ、サンプル JSON が `docs/data/portfolios/ideco/current.json` に含まれています。実データに差し替える場合は上記 1〜3 を実行してください。

### デプロイ設定（初回のみ）

1. **Settings → Pages → Source** を **GitHub Actions** に設定する。
2. [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) が `apps/web/out` をデプロイする。
3. 公開 URL 例: `https://<owner>.github.io/investment-portfolio/`

### ローカルでの静的ビルド確認

```bash
npm run build
npx serve apps/web/out
```

`serve` 起動後: [http://localhost:3000/investment-portfolio/](http://localhost:3000/investment-portfolio/)
明細は `docs/data` から同期された JSON を参照します。

## 技術スタック

- **Next.js**（App Router）+ **TypeScript** + **React** — 静的エクスポート（GitHub Pages）
- **Hono** + **better-sqlite3** + **Drizzle ORM** — ローカル API / SQLite
- **Vitest** — 単体テスト

## 将来の機能

- 資産配分、コア・サテライト、リバランス
- 口座別・通貨別分析、日付履歴、シミュレーション、可視化
- PostgreSQL への移行

変更履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。
