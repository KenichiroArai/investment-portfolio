import { describe, expect, it, vi } from "vitest";

import { parseSbiWrapPaste, SbiWrapPasteError } from "../src/sbi-wrap-paste";

describe("sbi-wrap-paste coverage", () => {
  it("treats non-finite parsed weight values as null", () => {
    const parseFloatSpy = vi.spyOn(Number, "parseFloat").mockReturnValueOnce(Number.NaN);

    const parsed = parseSbiWrapPaste(`資産残高
2026/07/17 時点
10,100円
内訳
（ラップ専用）ＳＢＩ・米国株式
評価額
1,617円
比率
16.0%
現金
208円
比率
2.1%`);

    expect(parsed.holdings[0].weight).toBeNull();
    parseFloatSpy.mockRestore();
  });

  it("stops at the next asset balance header while parsing entries", () => {
    const parsed = parseSbiWrapPaste(`資産残高
2026/07/17 時点
10,100円
内訳
（ラップ専用）ＳＢＩ・米国株式
評価額
1,617円
比率
16.0%
資産残高
2026/07/18 時点
10,200円
内訳
ラップ専用・世界株式アクティブ（グローバル・マルチテーマ）
評価額
2,979円
比率
29.5%
現金
208円
比率
2.1%`);

    expect(parsed.holdings.some((row) => row.productName === "AI投資")).toBe(true);
    expect(parsed.holdings.some((row) => row.productName === "匠の運用")).toBe(true);
  });

  it("skips dashboard labels and breaks on truncated instrument rows", () => {
    const parsed = parseSbiWrapPaste(`資産残高
2026/07/17 時点
10,100円
内訳
購入
積立
資産推移
資産推移情報を読み込む
資産構成
資産構成比率
評価額
比率
（ラップ専用）ＳＢＩ・米国株式
評価額
1,617円
比率
16.0%
（ラップ専用）ＳＢＩ・先進国株式
現金
208円
比率
2.1%`);

    expect(parsed.holdings).toHaveLength(2);
  });

  it("throws when duplicate product blocks leave no readable rows", () => {
    expect(() =>
      parseSbiWrapPaste(`資産残高
2026/07/17 時点
10,100円
内訳
マルチアセット戦略ファンド・マネーファンド（ラップ専用）
評価額
0円
比率
--%
資産残高
2026/07/17 時点
10,100円
内訳
マルチアセット戦略ファンド・マネーファンド（ラップ専用）
評価額
0円
比率
--%`),
    ).toThrow(SbiWrapPasteError);
  });
});
