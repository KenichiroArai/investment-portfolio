# Changelog

## [Unreleased]

### Fixed

- `.gitignore` の `data/` が `docs/data/` まで無視していたため、GitHub Pages ビルドにサンプル JSON が含まれない問題を修正（`/data/` に限定）

### Added

- SQLite サンプルデータ: `npm run db:seed:sample` / `db:seed:clear`、`SEED_SAMPLE_DATA` と `data/portfolio.sample.db` で本番用 DB と切り替え
- API: `npm run dev:api:sample`、`/health` に `sampleMode` / `sampleSeeded`
- GitHub Pages 向け静的 JSON 公開: `docs/data/` を正本とし、`npm run pages:export` で SQLite からエクスポート
- 本番ビルド時に `docs/data` を `apps/web/public/data` へ同期し、明細画面が JSON を読み込む

## [0.1.0] - 2026-06-03

### Added

- SQLite スキーマ（口座・銘柄・口座スコープ分類・最新スナップショット明細）
- ローカル API（`apps/api`）: 手動マスタ投入と iDeCo 最新明細の GET/PUT
- Web: 共通メニュー、iDeCo 明細ページ（`/portfolios/ideco/holdings/`）
- `@repo/db`, `@repo/shared` パッケージ

### Notes

- 分析・登録・更新画面はメニューのみ（準備中）
- 本番用 DB の自動シードは行わない（サンプルモードのみ）
