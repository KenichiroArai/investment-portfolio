# investment-portfolio

投資ポートフォリオの管理・分析を行うためのツールです。

**v0.1.0** では iDeCo の最新保有明細の表示と、手動でのマスタ・明細投入（ローカル API）に対応しています。分析・登録・更新画面は今後追加予定です。

## v0.1.0 の範囲

- SQLite（`data/portfolio.db`）+ Drizzle ORM（将来 PostgreSQL へ移行可能なスキーマ）
- 口座スコープの分類体系（銘柄に複数タグ付与、将来の集計用）
- ローカル API（`apps/api`、既定 `http://127.0.0.1:3001`）
- Web: トップ（ハブ）+ メニュー + **口座明細（iDeCo）** のみデータ表示

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

## ローカル起動（API + Web）

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

### `npm run dev:all` がすぐ終了する場合

コマンドは **`npm`**（`rpm` ではありません）。次のようなログで Web が落ち、`-k` により API も止まります。

- `EADDRINUSE ... :::3000` — **3000 が既に使用中**（前の `next dev` や別ターミナルの `dev:all` が残っている）
- `Another next dev server is already running` — 同じ `apps/web` で別の `next dev` が残っている

**対処（推奨）:** 開発用ポートを空けてから再実行します。

```bash
npm run dev:stop
npm run dev:all
```

`dev:stop` は Web（3000）と API（3001）の待ち受けを終了します。別ターミナルで `dev:all` を動かしている場合は、そのターミナルで `Ctrl+C` してから実行してください。

手動で止める場合（Windows）:

```powershell
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess
taskkill /PID <PID> /F
```

止めたうえで `npm run dev:all` を実行し、ログに次が出ることを確認します。

- `[dev] Local: http://localhost:3000`
- `[dev:api] API http://127.0.0.1:3001`

環境変数（任意）:

- `DATABASE_PATH` — SQLite ファイル（既定: `data/portfolio.db`）

`data/` はローカル専用です（`.gitignore` で除外）。SQLite と投入用 CSV コピーをまとめて置きます。

```text
data/
├── portfolio.db              # SQLite（migrate / import で生成）
└── imports/
    └── ideco/
        └── holdings.csv      # 明細 CSV のローカルコピー（正本は SVN）
```
- `PORT` / `HOST` — API の待ち受け（既定: `127.0.0.1:3001`）
- `NEXT_PUBLIC_API_URL` — Web から参照する API（既定: `http://127.0.0.1:3001`）

- 開発時は Web がローカル API から明細を取得します。
- 本番（GitHub Pages）ビルドでは `docs/data/` の JSON を静的に読み込みます（登録・更新はローカルのみ）。

## 開発環境での確認

`npm run dev:all` で API と Web を起動したあと、次で動作を確認できます。

### API（curl）

```bash
# 起動確認
curl -s http://127.0.0.1:3001/health

# 口座一覧（データ未投入なら []）
curl -s http://127.0.0.1:3001/portfolios

# 最新明細（ideco を投入済みの場合）
curl -s http://127.0.0.1:3001/portfolios/ideco/snapshot/current
```

`health` が JSON で返れば API は待ち受けできています。明細は [手動データ投入](#手動データ投入例) のあと `snapshot/current` で確認します。

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
```

カバレッジ付きで確認する場合は `npm run test:coverage`（詳細は [テスト](#テスト)）。

## iDeCo データ投入（明細 CSV）

iDeCo 口座の明細は、保有明細 CSV（`番号,日付,商品タイプ,運用商品名,...` 形式）から SQLite へ一括投入できます。iDeCo 専用の CLI です。

正本（リポジトリ外）:

```text
D:\SVN\日常作業\trunk\記録\家計簿\家計簿.csv
```

```bash
npm run db:import:ideco -- "D:\SVN\日常作業\trunk\記録\家計簿\家計簿.csv"
```

ローカルコピー（`data/imports/ideco/holdings.csv`）を使う場合:

```bash
npm run db:import:ideco -- data/imports/ideco/holdings.csv
```

`data/` 配下は個人データのため Git 管理しません。初回は SVN 正本を `data/imports/ideco/holdings.csv` にコピーしてください。

投入内容:

- 口座 `ideco`（未作成なら自動作成）
- 分類体系 `ideco_product_type`（商品タイプ）と各銘柄へのタグ付け
- 最新明細（`asOfDate` は CSV の日付列、`資産残高`・`購入金額` は千円→円に変換）

投入後、GitHub Pages 用 JSON を更新する場合は [GitHub Pages 向けデータ公開](#github-pages-向けデータ公開) の `npm run pages:export` を実行してください。ローカル API で確認する場合は `npm run dev:api` 起動後、**口座明細（iDeCo）** を開きます。

SQLite の内容を SQL で確認する場合は [dev/sql/README.md](dev/sql/README.md) を参照してください。

## 手動データ投入（例）

次の順で API に POST/PUT してください（`curl` 等）。CSV がある場合は上記 [iDeCo データ投入（明細 CSV）](#ideco-データ投入明細-csv) が簡単です。

```bash
# 1. 口座
curl -s -X POST http://127.0.0.1:3001/portfolios \
  -H "Content-Type: application/json" \
  -d '{"code":"ideco","name":"iDeCo","kind":"ideco"}'

# 2. 分類体系（口座 ideco スコープ）
curl -s -X POST http://127.0.0.1:3001/portfolios/ideco/classification-schemes \
  -H "Content-Type: application/json" \
  -d '{"code":"region","name":"地域"}'
# → 返却 JSON の id を SCHEME_ID に

# 3. 分類値
curl -s -X POST http://127.0.0.1:3001/classification-schemes/SCHEME_ID/values \
  -H "Content-Type: application/json" \
  -d '{"code":"japan","name":"日本"}'
# → VALUE_ID

# 4. 銘柄
curl -s -X POST http://127.0.0.1:3001/instruments \
  -H "Content-Type: application/json" \
  -d '{"name":"eMAXIS Slim 国内株式(TOPIX)"}'
# → INSTRUMENT_ID

# 5. タグ付け
curl -s -X PUT http://127.0.0.1:3001/instruments/INSTRUMENT_ID/classifications \
  -H "Content-Type: application/json" \
  -d '{"classificationValueIds":["VALUE_ID"]}'

# 6. 最新明細
curl -s -X PUT http://127.0.0.1:3001/portfolios/ideco/snapshot/current \
  -H "Content-Type: application/json" \
  -d '{"asOfDate":"2026-06-01","lines":[{"instrumentId":"INSTRUMENT_ID","quantity":100,"marketValueMinor":500000}]}'
```

Web のメニュー **口座明細（iDeCo）** で表示を確認します。

### iDeCo 公式商品タイプ（参考・DB 非投入）

運用商品の「商品タイプ」は、手動で作る分類体系（例: `ideco_product_type`）の値として登録してください。

| 商品タイプ | 運用商品名（略称）の例 |
| --- | --- |
| 国内株式 | eMAXIS Slim 国内株式(TOPIX) |
| 内外株式 | SBI・全世界株式インデックス・ファンド |
| 海外株式 | eMAXIS Slim 全世界株式(除く日本) 等 |
| 国内債券 / 海外債券 | eMAXIS Slim 系列、iFree 新興国債券 等 |
| 国内・海外不動産投信 | ニッセイ J-REIT、三井住友 DC 外国リート 等 |
| 内外資産複合 | eMAXIS Slim バランス、iFree 年金バランス 等 |
| 国内その他資産 | 三菱 UFJ 純金ファンド |
| 元本確保 | あおぞら DC 定期(1年) |

独自分類の例: 体系 `region`（日本 / 海外）、`currency`（円 / ドル）。サテライト口座は別口座・別分類体系として追加します。

## テスト

```bash
npm install
npm test
npm run test:coverage
```

## GitHub Pages 向けデータ公開

公開用 JSON の正本は [`docs/`](docs/) 以下のみです（詳細は [docs/README.md](docs/README.md)）。

1. ローカル API で SQLite にデータを投入・更新する（[手動データ投入（例）](#手動データ投入例)）。
2. エクスポートする。

```bash
npm run pages:export
```

3. `docs/data/` の変更をコミットして `main` に push する。
4. GitHub Actions がビルド時に `docs/data` を `apps/web/public/data` へ同期し、静的サイトをデプロイする（CI では SQLite に接続しません）。

初回のみ、サンプル JSON が `docs/data/portfolios/ideco/current.json` に含まれています。実データに差し替える場合は上記 1〜3 を実行してください。

## 本番ビルド（静的サイト）

```bash
npm run build
npx serve apps/web/out
```

`serve` 起動後: [http://localhost:3000/investment-portfolio/](http://localhost:3000/investment-portfolio/)  
明細は `docs/data` から同期された JSON を参照します。

## デプロイ（GitHub Pages）

1. **Settings → Pages → Source** を **GitHub Actions** に設定（初回のみ）。
2. `docs/data` を含む状態で `main` へ push する（[GitHub Pages 向けデータ公開](#github-pages-向けデータ公開)）。
3. [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) が `apps/web/out` をデプロイ。
4. 公開 URL 例: `https://<owner>.github.io/investment-portfolio/`

## 技術スタック

- **Next.js**（App Router）+ **TypeScript** + **React** — 静的エクスポート（GitHub Pages）
- **Hono** + **better-sqlite3** + **Drizzle ORM** — ローカル API / SQLite
- **Vitest** — 単体テスト

## 将来（README 機能リスト）

- 資産配分、コア・サテライト、リバランス
- 口座別・通貨別分析、日付履歴、シミュレーション、可視化
- PostgreSQL への移行

変更履歴は [CHANGELOG.md](CHANGELOG.md) を参照してください。
