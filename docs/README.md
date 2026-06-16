# GitHub Pages 公開データ（`docs/`）

GitHub Pages で表示するスナップショット JSON の正本です。アプリ本体（`apps/web`）には Pages 専用のデータファイルを置きません。

## 配置

```text
docs/data/
├── portfolios.json                              # 口座一覧
└── portfolios/<口座コード>/
    ├── current.json                             # 最新スナップショット
    ├── snapshots-index.json                     # 基準日一覧
    ├── snapshots/<YYYY-MM-DD>.json                # 基準日別スナップショット
    ├── trends-summary.json                      # 推移集計（評価額・構成比）
    ├── target-allocations.json                  # 分類軸ごとの目標配分
    └── target-portfolio-weights.json            # 銘柄ごとの目標ウェイト
```

`current.json` および `snapshots/*.json` は API の `GET /portfolios/:code/snapshot/current` および `GET /portfolios/:code/snapshots/:asOfDate` と同じ `CurrentSnapshotDto` 形式です。

## 更新手順（ローカルのみ）

1. [README の iDeCo データ投入](../README.md#ideco-データ投入)（`npm run db:import:ideco`）で SQLite にデータを投入する。
2. 目標配分・銘柄ウェイトなどをローカル API 経由で編集する（任意）。
3. リポジトリルートで次を実行する。

```bash
npm run pages:export
```

4. `docs/data/` および `apps/web/src/lib/portfolio-catalog.ts` の変更をコミットして `main` に push する。
5. GitHub Actions が `npm run build` 時に `docs/data` を `apps/web/public/data` へ同期し、静的サイトをデプロイする。

CI では SQLite に接続せず、コミット済みの JSON のみを使います。
