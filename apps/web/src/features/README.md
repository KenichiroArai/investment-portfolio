# features

画面単位の機能コードを配置します。各 feature は `components/` 配下の共有 UI や `@repo/shared` の計算ロジックを組み合わせて構成します。

## モジュール一覧

| ディレクトリ | 画面・責務 |
| --- | --- |
| `home/` | ホーム（全口座サマリー、口座管理） |
| `portfolio/` | 口座シェル、基準日コンテキスト、概要、明細・推移パネル |
| `holdings/` | 明細テーブル、期間比較 |
| `analysis/` | 資産配分、全口座分析 |
| `allocation/` | 配分パネル・目標配分編集・リバランス試算 UI |
| `portfolio-allocation/` | 銘柄ごとのポートフォリオ配分・銘柄軸リバランス |
| `trends/` | 推移チャート・期間変化 |
| `manage/` | 設定（データ管理、分類） |

## ルーティング対応

| パス | feature |
| --- | --- |
| `/` | `home/HomeView` |
| `/analysis/` | `analysis/GlobalAnalysisView` |
| `/portfolios/[code]/` | `portfolio/PortfolioOverviewView` |
| `/portfolios/[code]/holdings/` | リダイレクト → `portfolio-allocation/?view=details&panel=holdings` |
| `/portfolios/[code]/analysis/` | `analysis/AnalysisView`（推移・配分タブ） |
| `/portfolios/[code]/portfolio-allocation/` | `portfolio-allocation/PortfolioAllocationView`（明細・推移・配分タブ） |
| `/portfolios/[code]/trends/` | リダイレクト → 配分ページの推移タブ |
| `/portfolios/[code]/settings/` | `manage/DataManageView` ほか |

## 配置の目安

- 1 画面に閉じる UI とその専用フック → 当該 feature 配下
- 複数 feature で使う計算・整形 → `packages/shared`
- 複数 feature で使う UI → `src/components/`
