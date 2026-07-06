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
│   ├── shared/              # 計算・DTO・Zod スキーマ（フレームワーク非依存）
│   ├── tsconfig/
│   └── ui/
├── docs/                    # GitHub Pages 公開用データ（JSON 正本）
├── dev/                     # 開発者向け資料（DB 確認 SQL 等）
├── data/                    # ローカルデータ（SQLite、git 無視）
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

`data/` はローカル専用です（`.gitignore` で除外）。SQLite を置きます。

```text
data/
└── portfolio.db              # SQLite（migrate で生成）
```

環境変数（任意）:

- `DATABASE_PATH` — SQLite ファイル（既定: `data/portfolio.db`）
- `PORT` / `HOST` — API の待ち受け（既定: `127.0.0.1:3001`）
- `NEXT_PUBLIC_API_URL` — Web から参照する API（既定: `http://127.0.0.1:3001`）
- `NEXT_PUBLIC_DATA_SOURCE` — `api` / `static`（本番ビルドでは `static` に自動設定）

- 開発時は Web がローカル API からデータを取得します（登録・更新も API 経由）。
- 本番（GitHub Pages）ビルドでは `docs/data/` の JSON を静的に読み込みます（閲覧のみ）。

## ローカルでのデータ登録

iDeCo 口座のデータは、ローカル API 接続時に Web の設定画面（データ管理・iDeCo 一括取り込み）から登録・更新します。DB 格納の code 慣例は [dev/sql/ideco/README.md](dev/sql/ideco/README.md) を参照してください。

マネックス証券（ON COMPASS）口座は CSV から一括投入します。DB 格納の code 慣例は [dev/sql/monex/README.md](dev/sql/monex/README.md) を参照してください。

```bash
npm run db:migrate
npm run db:import:monex -- data/imports/monex
```

`data/imports/monex/` に ON COMPASS からエクスポートした CSV（Shift_JIS）を配置してから実行します。投入後は `npm run pages:export` で静的 JSON を更新できます。

`data/` 配下は個人データのため Git 管理しません。

SQLite の内容を SQL で確認する場合は [dev/sql/README.md](dev/sql/README.md) を参照してください。

## 機能

### 実装済み

| 領域 | 内容 |
| --- | --- |
| ホーム | 全口座の評価額・損益サマリー、口座の追加・編集 |
| 全口座分析 | 複数口座を合算した資産配分（`/analysis/`） |
| 口座概要 | 評価額・損益・拠出金サマリー、配分ページへの導線、基準日切替 |
| 明細 | ポートフォリオ配分ページ内（明細・推移タブ）— 保有銘柄一覧、期間比較 |
| 資産配分 | 推移タブ（構成比）と配分タブ（目標・リバランス） |
| ポートフォリオ配分 | 明細・推移タブと配分タブ（銘柄目標・リバランス試算） |
| 推移 | ポートフォリオ配分（評価額・損益）と資産配分（構成比）に統合 |
| 設定 | データ管理（銘柄・明細・指標の登録・更新）、分類設定、目標配分 |
| データ投入 | iDeCo 貼り付け一括取り込み、マネックス証券 CSV インポート、設定画面での銘柄・明細・指標登録 |
| GitHub Pages | 静的 JSON による閲覧（登録・更新はローカルのみ） |

### 今後の予定

- 投資シミュレーション
- 通貨別分析（外貨建て資産の換算・集計）
- NISA・課税口座など他口座種別のデータ取り込み（マネックス証券は CSV 対応済み）
- PostgreSQL への移行

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

# 基準日一覧・推移・目標配分
curl -s http://127.0.0.1:3001/portfolios/ideco/snapshots
curl -s "http://127.0.0.1:3001/portfolios/ideco/snapshots/trends"
curl -s http://127.0.0.1:3001/portfolios/ideco/target-allocations
```

`health` が JSON で返れば API は待ち受けできています。明細は [ローカルでのデータ登録](#ローカルでのデータ登録) のあと `snapshot/current` で確認します。

### Web（ブラウザ）

| URL | 内容 |
| --- | --- |
| [http://localhost:3000/](http://localhost:3000/) | ホーム（全口座サマリー） |
| [http://localhost:3000/analysis/](http://localhost:3000/analysis/) | 全口座分析 |
| [http://localhost:3000/portfolios/ideco/](http://localhost:3000/portfolios/ideco/) | 口座概要（iDeCo） |
| [http://localhost:3000/portfolios/ideco/portfolio-allocation/](http://localhost:3000/portfolios/ideco/portfolio-allocation/) | ポートフォリオ配分（明細・推移・配分） |
| [http://localhost:3000/portfolios/ideco/analysis/](http://localhost:3000/portfolios/ideco/analysis/) | 資産配分（推移・配分） |
| [http://localhost:3000/portfolios/ideco/settings/data/](http://localhost:3000/portfolios/ideco/settings/data/) | データ管理（ローカル API のみ） |

口座画面のタブから各機能に遷移します。API が止まっている、または `NEXT_PUBLIC_API_URL` が実際の API と一致しない場合は画面上でエラーになります。設定・登録系はローカル API 接続時のみ利用できます。

### 型チェック・テスト（起動不要）

```bash
npm run lint
npm test
npm run test:coverage
```

## GitHub Pages 公開

公開用 JSON の正本は [`docs/`](docs/) 以下のみです（詳細は [docs/README.md](docs/README.md)）。

1. ローカル API と Web を起動し、設定画面で SQLite にデータを登録する（[ローカルでのデータ登録](#ローカルでのデータ登録)）。
2. 目標配分などローカルで編集した内容も SQLite に反映しておく。
3. エクスポートする。

   ```bash
   npm run pages:export
   ```

   口座一覧・各口座の `current.json`、基準日別スナップショット、推移サマリー、目標配分、銘柄目標ウェイト、および `apps/web/src/lib/portfolio-catalog.ts` が更新されます。

4. `docs/data/` と `portfolio-catalog.ts` の変更をコミットして `main` に push する。
5. GitHub Actions がビルド時に `docs/data` を `apps/web/public/data` へ同期し、静的サイトをデプロイする（CI では SQLite に接続しません）。

初回のみ、サンプル JSON が `docs/data/` に含まれています。実データに差し替える場合は上記 1〜4 を実行してください。

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
- **Recharts** — チャート可視化
- **Vitest** + **Testing Library** — 単体・コンポーネントテスト

## コード配置

| パス | 役割 |
| --- | --- |
| `apps/web/src/features/` | 画面単位の機能（[README](apps/web/src/features/README.md)） |
| `apps/web/src/lib/` | Web 専用ユーティリティ（[README](apps/web/src/lib/README.md)） |
| `apps/web/src/components/` | 共有 UI（[README](apps/web/src/components/README.md)） |
| `packages/shared/` | 計算・整形・Zod スキーマ（フレームワーク非依存） |
| `packages/db/` | スキーマ・リポジトリ・マイグレーション（[README](packages/db/README.md)） |
