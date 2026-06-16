# lib

Web アプリ専用のユーティリティ・ヘルパーを配置します。フレームワーク非依存の計算は `packages/shared` に置き、Next.js や fetch の文脈に依存するものだけをここに置きます。

## モジュール一覧

| ファイル | 役割 |
| --- | --- |
| `api-base.ts` | API ベース URL の解決 |
| `api-client.ts` | 分類体系・銘柄などの CRUD 用 fetch ラッパー |
| `data-source.ts` | API / 静的 JSON の切替、各エンドポイント URL 生成 |
| `portfolio-catalog.ts` | 静的ビルド用口座一覧（`pages:export` で更新） |
| `portfolio-path.ts` | 口座コードを含むパス組み立て |
| `portfolio-time-bar.ts` | 基準日バー用の表示ヘルパー |
| `format-yen.ts` | 円・パーセント・日付の表示整形 |
| `format-holding-line.ts` | 明細行の表示用ラベル整形 |
| `chart-theme.ts` | チャートの色・テーマ定数 |
| `utils.ts` | `cn()` など汎用ヘルパー |

## データソース

- 開発時（既定）: ローカル Hono API（`NEXT_PUBLIC_API_URL`）
- 本番ビルド: `docs/data/` から同期された静的 JSON（`NEXT_PUBLIC_DATA_SOURCE=static`）
