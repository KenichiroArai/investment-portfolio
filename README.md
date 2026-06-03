# investment-portfolio

投資ポートフォリオの管理・分析を行うためのツールです。

株式、債券、現金、コモディティなどの資産クラスや、NISA、iDeCo、特定口座などの口座単位で資産を管理できます。

## 主な機能

- 資産配分（アセットアロケーション）の分析
- コア・サテライト戦略の管理
- リバランス計算
- 口座別資産管理
- 通貨別資産分析
- 日付ごとのポートフォリオ記録
- 将来の配分シミュレーション
- 投資状況の可視化

## リポジトリ構成

npm workspaces のモノレポです。初期実装は `apps/web` のランディングページのみです。

```text
investment-portfolio/
├── apps/
│   └── web/                 # Next.js（GitHub Pages のデプロイ対象）
│       ├── src/             # 本番コード
│       │   ├── app/         # ルーティング・レイアウト
│       │   ├── features/    # 機能単位（将来追加）
│       │   ├── components/  # アプリ横断 UI
│       │   ├── lib/         # アプリ専用ユーティリティ
│       │   └── types/       # アプリ専用型
│       └── tests/           # 単体テスト（src と同じ階層構造）
├── packages/
│   ├── tsconfig/            # 共有 TypeScript 設定
│   ├── ui/                  # 共有 UI（将来）
│   │   ├── src/
│   │   └── tests/
│   └── shared/              # 共有型・ロジック（将来）
│       ├── src/
│       └── tests/
└── package.json             # ワークスペースルート
```

| パス | 用途 |
| --- | --- |
| `apps/web/src/app/` | ページ・レイアウト |
| `apps/web/tests/` | 単体テスト（`src/` をミラー。例: `tests/app/page.test.tsx` → `src/app/page.tsx`） |
| `apps/web/src/features/<name>/` | 機能ごとのコード |
| `packages/*/tests/` | 各パッケージの単体テスト |
| `packages/ui` | デザインシステム・汎用 UI |
| `packages/shared` | フレームワーク非依存の型・計算 |

## 前提

- Node.js 22 推奨
- npm

## テスト

リポジトリルートで実行します。テストは各ワークスペースの `tests/` に置き、`src/` とは分離しています（`apps/web/tests/` は `apps/web/src/` と同じディレクトリ構造）。

カバレッジ対象は `apps/web` のページ・設定です。`packages/shared` と `packages/ui` はプレースホルダーのみのため、モジュール読み込みのスモークテストのみ行います（実装追加後にカバレッジ対象へ含めます）。

```bash
npm install
npm test
```

ウォッチモード（ファイル変更で再実行）:

```bash
npm run test:watch
```

カバレッジ付き（行・分岐・関数・文がすべて 100% であることを閾値で検証）:

```bash
npm run test:coverage
```

レポートは `coverage/` に出力されます。

## ローカル起動

リポジトリルートで実行します。

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000/](http://localhost:3000/) を開きます（開発時は `basePath` なし。GitHub Pages 用の `/investment-portfolio` は本番ビルド時のみ適用）。

本番相当の確認:

```bash
npm run build
npx serve apps/web/out
```

`serve` 起動後は [http://localhost:3000/investment-portfolio/](http://localhost:3000/investment-portfolio/) で確認します。

## デプロイ（GitHub Pages）

1. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定する（初回のみ）。
2. `main` ブランチへ push すると [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) がビルドし、`apps/web/out` をデプロイする。
3. 公開 URL の例: `https://<owner>.github.io/investment-portfolio/`

## 技術スタック

- **Next.js**（App Router）+ **TypeScript** + **React**
- 静的エクスポート（`output: "export"`）で GitHub Pages にホスティング
- **Vite** は採用していません。Next.js は公式に Vite をバンドラとして利用できないため、Next.js 標準のツールチェーンを使用しています。
