# GitHub Pages 公開データ（`docs/`）

GitHub Pages で表示するスナップショット JSON の正本です。アプリ本体（`apps/web`）には Pages 専用のデータファイルを置きません。

## 配置

```text
docs/data/portfolios/<口座コード>/current.json
```

`current.json` は API の `GET /portfolios/:code/snapshot/current` と同じ `CurrentSnapshotDto` 形式です。

## 更新手順（ローカルのみ）

1. [README の iDeCo データ投入](../README.md#ideco-データ投入)（`npm run db:import:ideco`）で SQLite にデータを投入する。
2. リポジトリルートで次を実行する。

```bash
npm run pages:export
```

3. `docs/data/` の変更をコミットして `main` に push する。
4. GitHub Actions が `npm run build` 時に `docs/data` を `apps/web/public/data` へ同期し、静的サイトをデプロイする。

CI では SQLite に接続せず、コミット済みの JSON のみを使います。
