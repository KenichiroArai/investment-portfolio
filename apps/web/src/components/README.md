# components

複数の feature で共有する UI コンポーネントを配置します。画面専用の部品は `features/<name>/` 側に置きます。

## 構成

| パス | 内容 |
| --- | --- |
| `layout/` | `app-shell`, `top-bar`, `page-header`, `page-container`, `settings-sidebar` |
| `ui/` | shadcn/ui ベースのプリミティブ（Button, Card, Table, Tabs など） |
| `PortfolioContextBar.tsx` | 口座タブナビ（概要・明細・配分・リバランス・推移） |
| `SnapshotTimeBar.tsx` | 基準日選択バー |
| `AnalysisSubNav.tsx` | 資産配分画面のサブナビ |
| `SortableTableHeader.tsx` | ソート可能テーブルヘッダ |
| `empty-state.tsx` | 空状態表示 |
| `loading-skeleton.tsx` | ローディングスケルトン |
| `stat-card.tsx` | 数値サマリーカード |
| `form-field.tsx` | フォームフィールドラッパー |
| `theme-provider.tsx` | ダークモード対応 |
