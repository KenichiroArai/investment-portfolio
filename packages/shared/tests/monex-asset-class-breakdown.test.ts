import { describe, expect, it } from "vitest";

import {
  buildMonexInstrumentAssetClassBreakdownFromMarketValues,
  resolveMonexInstrumentAssetClassBreakdown,
} from "../src/monex-asset-class-breakdown";
import { buildMonexInstrumentNameAliasMap } from "../src/monex-instrument-aliases";

describe("monex-asset-class-breakdown", () => {
  it("builds instrument asset class breakdown across classes", () => {
    const breakdown = buildMonexInstrumentAssetClassBreakdownFromMarketValues([
      { instrumentName: "テスト複合ファンド", valueCode: "domestic_equity", marketValueMinor: 600 },
      { instrumentName: "テスト単独ファンド", valueCode: "domestic_equity", marketValueMinor: 400 },
      { instrumentName: "テスト複合ファンド", valueCode: "domestic_bond", marketValueMinor: 400 },
    ]);

    const composite = breakdown.get("テスト複合ファンド");
    expect(composite).toHaveLength(2);
    expect(
      composite?.find((item) => item.valueCode === "domestic_equity")?.allocationWeight,
    ).toBeCloseTo(0.6);
    expect(
      composite?.find((item) => item.valueCode === "domestic_bond")?.allocationWeight,
    ).toBeCloseTo(0.4);

    const single = breakdown.get("テスト単独ファンド");
    expect(single).toEqual([
      { valueCode: "domestic_equity", allocationWeight: 1 },
    ]);
  });

  it("merges rows by canonical name using the alias map", () => {
    const aliasMap = new Map([["正規名", ["別名表記"]]]);
    const breakdown = buildMonexInstrumentAssetClassBreakdownFromMarketValues(
      [
        { instrumentName: "別名表記", valueCode: "domestic_equity", marketValueMinor: 600 },
        { instrumentName: "正規名", valueCode: "domestic_bond", marketValueMinor: 400 },
      ],
      aliasMap,
    );

    expect(breakdown.has("別名表記")).toBe(false);
    const merged = breakdown.get("正規名");
    expect(merged).toHaveLength(2);
    expect(
      merged?.find((item) => item.valueCode === "domestic_equity")?.allocationWeight,
    ).toBeCloseTo(0.6);
  });

  it("merges MSV asset-class alias into compass holding name", () => {
    const aliasMap = buildMonexInstrumentNameAliasMap();
    const breakdown = buildMonexInstrumentAssetClassBreakdownFromMarketValues(
      [
        {
          instrumentName: "ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）",
          valueCode: "developed_equity",
          marketValueMinor: 6286,
        },
        {
          instrumentName: "ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）",
          valueCode: "developed_bond",
          marketValueMinor: 1367,
        },
        {
          instrumentName: "ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）",
          valueCode: "domestic_equity",
          marketValueMinor: 908,
        },
      ],
      aliasMap,
    );

    expect(breakdown.has("ＭＳＶ内外ＥＴＦ資産配分ファンド（Ｇコース）")).toBe(false);
    const msv = breakdown.get("ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ");
    expect(msv).toHaveLength(3);
    const total = 6286 + 1367 + 908;
    expect(
      msv?.find((item) => item.valueCode === "developed_equity")?.allocationWeight,
    ).toBeCloseTo(6286 / total);
    expect(
      resolveMonexInstrumentAssetClassBreakdown(
        breakdown,
        "ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ",
        [],
        aliasMap,
      ),
    ).toHaveLength(3);
  });

  it("ignores non-positive and non-finite market values", () => {
    const breakdown = buildMonexInstrumentAssetClassBreakdownFromMarketValues([
      { instrumentName: "ゼロ評価", valueCode: "domestic_equity", marketValueMinor: 0 },
      { instrumentName: "不正値", valueCode: "domestic_equity", marketValueMinor: Number.NaN },
    ]);
    expect(breakdown.size).toBe(0);
  });

  it("resolves breakdown by direct name and alias names", () => {
    const breakdown = new Map([
      ["正規名", [{ valueCode: "eq", allocationWeight: 1 }]],
    ]);
    expect(
      resolveMonexInstrumentAssetClassBreakdown(breakdown, "正規名", []),
    ).toHaveLength(1);
    expect(
      resolveMonexInstrumentAssetClassBreakdown(breakdown, "別名", ["正規名"]),
    ).toHaveLength(1);
    expect(
      resolveMonexInstrumentAssetClassBreakdown(breakdown, "missing", ["未登録"]),
    ).toEqual([]);
  });
});
