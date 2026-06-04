# Changelog

## [0.1.0] - 2026-06-03

### Added

- SQLite スキーマ（口座・銘柄・口座スコープ分類・最新スナップショット明細）
- ローカル API（`apps/api`）: 手動マスタ投入と iDeCo 最新明細の GET/PUT
- Web: 共通メニュー、iDeCo 明細ページ（`/portfolios/ideco/holdings/`）
- `@repo/db`, `@repo/shared` パッケージ

### Notes

- 分析・登録・更新画面はメニューのみ（準備中）
- マスタデータの自動シードは行わない
