import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { computeMonexMutualFundBookValueMinor } from "../src/monex-holding-metrics";
import {
  buildMonexAssetClassNameMap,
  buildMonexInstrumentAssetClassBreakdown,
  parseMonexAssetClassCsv,
  parseMonexDomesticHoldingsCsv,
  parseMonexUsStocksCsv,
} from "../src/index";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures/monex");

describe("monex csv parsers", () => {
  it("parses domestic holdings csv", () => {
    const content = readFileSync(join(fixtureDir, "国内株等.csv"), "utf8");
    const parsed = parseMonexDomesticHoldingsCsv(content);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      asOfDate: "2026-07-05",
      instrumentName: "テストファンドＡ",
      accountType: "一般",
      accountId: "monex:一般:普通預り",
      accountName: "一般 / 普通預り",
      quantity: 100,
      marketValueMinor: 1000,
      unrealizedGainRate: 0.0526,
    });
  });

  it("parses us stocks csv", () => {
    const content = readFileSync(join(fixtureDir, "米国株.csv"), "utf8");
    const parsed = parseMonexUsStocksCsv(content);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      ticker: "TEST",
      instrumentName: "テスト米国株",
      quantity: 2,
      marketValueMinor: 14400,
    });
  });

  it("computes mutual fund book value from avg cost per 10000 lots", () => {
    expect(computeMonexMutualFundBookValueMinor(29147, 3431)).toBe(10000);
    expect(computeMonexMutualFundBookValueMinor(9500, 100)).toBe(95);
  });

  it("builds asset class map from csv files", () => {
    const content = readFileSync(join(fixtureDir, "国内株式.csv"), "utf8");
    const map = buildMonexAssetClassNameMap(
      [{ fileName: "国内株式.csv", content }],
      {
        "国内株式.csv": { code: "domestic_equity", name: "国内株式" },
      },
    );

    expect(map.get("テストファンドＡ")).toBe("domestic_equity");
  });

  it("parses asset class csv with holding ratio and market value", () => {
    const content = readFileSync(join(fixtureDir, "国内株式.csv"), "utf8");
    const parsed = parseMonexAssetClassCsv(content);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      instrumentName: "テストファンドＡ",
      holdingRatio: 0.5,
      marketValueMinor: 1000,
    });
  });

  it("builds instrument asset class breakdown across files", () => {
    const compositeContent = `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/05","テスト複合ファンド","0.6","600","0","0"
"2","2026/07/05","テスト単独ファンド","0.4","400","0","0"`;
    const bondContent = `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/05","テスト複合ファンド","1.0","400","0","0"`;

    const breakdown = buildMonexInstrumentAssetClassBreakdown(
      [
        { fileName: "国内株式.csv", content: compositeContent },
        { fileName: "国内債券.csv", content: bondContent },
      ],
      {
        "国内株式.csv": { code: "domestic_equity", name: "国内株式" },
        "国内債券.csv": { code: "domestic_bond", name: "国内債券" },
      },
    );

    const composite = breakdown.get("テスト複合ファンド");
    expect(composite).toHaveLength(2);
    expect(composite?.find((item) => item.valueCode === "domestic_equity")?.allocationWeight).toBeCloseTo(
      0.6,
    );
    expect(composite?.find((item) => item.valueCode === "domestic_bond")?.allocationWeight).toBeCloseTo(
      0.4,
    );

    const single = breakdown.get("テスト単独ファンド");
    expect(single).toEqual([
      { valueCode: "domestic_equity", allocationWeight: 1 },
    ]);
  });
});
