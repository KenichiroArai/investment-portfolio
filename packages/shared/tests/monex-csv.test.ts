import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildMonexAssetClassNameMap,
  buildMonexInstrumentAssetClassBreakdown,
  parseMonexAssetClassCsv,
  parseMonexCompassFundCsv,
  parseMonexDomesticHoldingsCsv,
  parseMonexUsStocksCsv,
  resolveMonexInstrumentAssetClassBreakdown,
} from "../src/index";
import { MonexCsvError } from "../src/monex-csv-utils";
import {
  buildMonexHoldingMetrics,
  computeMonexMutualFundBookValueMinor,
} from "../src/monex-holding-metrics";

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

  it("parses domestic holdings rows with empty optional cells", () => {
    const content = `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/05","最小行","一般","","","","100","","1000","",""`;
    const parsed = parseMonexDomesticHoldingsCsv(content);

    expect(parsed.rows[0]).toMatchObject({
      instrumentName: "最小行",
      custodyType: "",
      dividendOption: "",
      unitPriceMinor: Number.NaN,
      avgCostMinor: Number.NaN,
      unrealizedGainMinor: Number.NaN,
      unrealizedGainRate: Number.NaN,
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

  it("parses us stocks rows with empty optional cells", () => {
    const content = `"日付","ティッカー","銘柄名","市場","口座区分","預り区分","保有株数","概算簿価単価(円)","概算評価額(円)","概算評価損益(円)","概算評価損益率(円)"
"2026/07/05","TEST","最小米国株","","","","2","","14400","",""`;
    const parsed = parseMonexUsStocksCsv(content);

    expect(parsed.rows[0]).toMatchObject({
      ticker: "TEST",
      market: "",
      custodyType: "",
      avgCostMinor: Number.NaN,
      unrealizedGainMinor: Number.NaN,
      unrealizedGainRate: Number.NaN,
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

  it("returns empty for header-only domestic and us stocks csv", () => {
    expect(parseMonexDomesticHoldingsCsv(`"日付","銘柄"\n`).rows).toEqual([]);
    expect(parseMonexUsStocksCsv(`"日付","銘柄名"\n`).rows).toEqual([]);
  });

  it("skips rows with empty instrument names", () => {
    const domestic = `"日付","銘柄","口座区分","預り区分","基準価額(円)","分配金の取扱い","保有数(口)","平均取得単価(円)","概算評価額(円)","評価損益(円)","評価損益率"
"2026/07/05","","一般","普通預り","10000","再投資","100","9500","1000","50","5.26"`;
    const usStocks = `"日付","ティッカー","銘柄名","市場","口座区分","預り区分","保有株数","概算簿価単価(円)","概算評価額(円)","概算評価損益(円)","概算評価損益率(円)"
"2026/07/05","TEST","","NYSE","一般","普通預り","2","7200","14400","400","2.86"`;
    expect(parseMonexDomesticHoldingsCsv(domestic).rows).toEqual([]);
    expect(parseMonexUsStocksCsv(usStocks).rows).toEqual([]);
  });

  it("throws on invalid domestic and us stocks dates", () => {
    const domestic = readFileSync(join(fixtureDir, "国内株等.csv"), "utf8").replace(
      "2026/07/05",
      "bad",
    );
    const usStocks = readFileSync(join(fixtureDir, "米国株.csv"), "utf8").replace(
      "2026/07/05",
      "bad",
    );
    expect(() => parseMonexDomesticHoldingsCsv(domestic)).toThrow(MonexCsvError);
    expect(() => parseMonexUsStocksCsv(usStocks)).toThrow(MonexCsvError);
  });

  it("parses compass fund csv", () => {
    const content = `"番号","日付","ファンド名","口座区分","預り区分","基準価額(円)","分配金","保有数(口)","平均取得単価(円)","概算評価額(円)","概算評価損益(円)"
"1","2026/07/05","テストコンパスF","一般","普通預り","10000","再投資","100","9500","1000","50"
"2","2026/07/05","","一般","普通預り","10000","再投資","100","9500","1000","50"`;
    const parsed = parseMonexCompassFundCsv(content);

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      asOfDate: "2026-07-05",
      instrumentName: "テストコンパスF",
      unrealizedGainRate: 50 / (9500 * 100),
    });
  });

  it("parses compass fund rows with empty optional cells and zero book value", () => {
    const content = `"番号","日付","ファンド名","口座区分","預り区分","基準価額(円)","分配金","保有数(口)","平均取得単価(円)","概算評価額(円)","概算評価損益(円)"
"1","2026/07/05","ゼロ簿価","一般","","","","0","","",""`;
    const parsed = parseMonexCompassFundCsv(content);

    expect(parsed.rows[0]).toMatchObject({
      instrumentName: "ゼロ簿価",
      custodyType: "",
      dividendOption: "",
      quantity: 0,
      avgCostMinor: Number.NaN,
      unrealizedGainRate: 0,
    });
  });

  it("returns empty for header-only compass csv and throws on invalid date", () => {
    expect(parseMonexCompassFundCsv(`"日付","ファンド名"\n`).rows).toEqual([]);
    const invalid = `"番号","日付","ファンド名","口座区分","預り区分","基準価額(円)","分配金","保有数(口)","平均取得単価(円)","概算評価額(円)","概算評価損益(円)"
"1","bad","テスト","一般","普通預り","10000","再投資","100","9500","1000","50"`;
    expect(() => parseMonexCompassFundCsv(invalid)).toThrow(MonexCsvError);
  });

  it("skips unknown asset class files and resolves breakdown aliases", () => {
    const map = buildMonexInstrumentAssetClassBreakdown(
      [{ fileName: "unknown.csv", content: "" }],
      {},
    );
    expect(map.size).toBe(0);

    const breakdown = new Map([
      ["正規名", [{ valueCode: "eq", allocationWeight: 1 }]],
    ]);
    expect(
      resolveMonexInstrumentAssetClassBreakdown(breakdown, "別名", ["正規名"]),
    ).toHaveLength(1);
    expect(resolveMonexInstrumentAssetClassBreakdown(breakdown, "missing", [])).toEqual([]);

    const aliasMap = new Map([["正規名", ["別名CSV表記"]]]);
    const content = `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/05","別名CSV表記","1.0","1000","0","0"`;
    const aliased = buildMonexInstrumentAssetClassBreakdown(
      [{ fileName: "国内株式.csv", content }],
      { "国内株式.csv": { code: "domestic_equity", name: "国内株式" } },
      aliasMap,
    );
    expect(aliased.has("正規名")).toBe(true);
  });

  it("returns empty for header-only asset class csv and skips blank names", () => {
    expect(parseMonexAssetClassCsv(`"銘柄","保有比率","評価額(円)"\n`).rows).toEqual([]);
    const blankName = `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/05","","1.0","1000","0","0"`;
    expect(parseMonexAssetClassCsv(blankName).rows).toEqual([]);
    const shortRow = `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/05","短い行"`;
    expect(parseMonexAssetClassCsv(shortRow).rows).toEqual([
      {
        instrumentName: "短い行",
        holdingRatio: Number.NaN,
        marketValueMinor: Number.NaN,
      },
    ]);
  });

  it("ignores non-positive market values and unknown asset class files in name map", () => {
    const zeroValueContent = `"番号","日付","銘柄","保有比率","評価額(円)","評価額前日比(円)","評価額前日比率"
"1","2026/07/05","ゼロ評価","1.0","0","0","0"`;
    const breakdown = buildMonexInstrumentAssetClassBreakdown(
      [{ fileName: "国内株式.csv", content: zeroValueContent }],
      { "国内株式.csv": { code: "domestic_equity", name: "国内株式" } },
    );
    expect(breakdown.size).toBe(0);

    const nameMap = buildMonexAssetClassNameMap(
      [{ fileName: "unknown.csv", content: zeroValueContent }],
      { "国内株式.csv": { code: "domestic_equity", name: "国内株式" } },
    );
    expect(nameMap.size).toBe(0);
  });

  it("returns zero for non-finite mutual fund book value inputs", () => {
    expect(computeMonexMutualFundBookValueMinor(Number.NaN, 100)).toBe(0);
  });

  it("builds monex holding metrics", () => {
    const metrics = buildMonexHoldingMetrics({
      unitPriceMinor: 10000,
      avgCostMinor: 9500,
      accountType: "一般",
      custodyType: "普通預り",
      dividendOption: "再投資",
      unrealizedGainMinor: 50,
      unrealizedGainRate: 0.05,
    });
    expect(metrics.some((metric) => metric.code === "unit_price_minor")).toBe(true);
  });
});
