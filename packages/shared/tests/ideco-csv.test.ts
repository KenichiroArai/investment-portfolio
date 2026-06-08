import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  resolveIdecoAnalysisAxisSchemeCode,
  resolveIdecoAnalysisTags,
  resolveIdecoProductType,
} from "../src/ideco-analysis";
import { parseIdecoAnalysisCsv } from "../src/ideco-analysis-csv";
import {
  IdecoCsvError,
  parseGainRate,
  parseIdecoDate,
  parseJapaneseInteger,
  parseJapanesePercentRate,
  stableIdecoCodeSuffix,
  stripUtf8Bom,
} from "../src/ideco-csv-utils";
import { parseIdecoGenericCsv } from "../src/ideco-generic-csv";
import {
  parseIdecoHoldingsCsv,
  parseIdecoHoldingsCsvByDate,
} from "../src/ideco-holdings-csv";
import { parseIdecoInstrumentsCsv } from "../src/ideco-instruments-csv";
import { IDECO_PORTFOLIO_METRIC_CODES } from "../src/ideco-portfolio-metrics";
import { parseIdecoProductTypesCsv } from "../src/ideco-product-types-csv";

const HOLDINGS_CSV = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,eMAXIS Slim 国内株式(TOPIX),"31,351","41,773","130,962","128,324","2,638",0.021
2,2026/6/2,eMAXIS Slim 全世界株式(除く日本),"38,275","104,130","398,557","385,705","12,852",3.30%
`;

describe("ideco csv parsers", () => {
  it("parses shared numeric and date helpers", () => {
    expect(parseJapaneseInteger("31,351")).toBe(31351);
    expect(parseIdecoDate("2026/6/2")).toBe("2026-06-02");
    expect(parseJapanesePercentRate("2.10%")).toBe(0.021);
    expect(parseGainRate("0.021")).toBe(0.021);
    expect(parseGainRate("2.10%")).toBe(0.021);
    expect(resolveIdecoProductType("国内株式").code).toBe("domestic_equity");
    expect(stripUtf8Bom("\uFEFFhello")).toBe("hello");
    expect(resolveIdecoAnalysisTags("domestic_equity")).toEqual({
      regionCode: "domestic",
      assetClassCode: "equity",
    });
    expect(resolveIdecoAnalysisTags("principal_protected")).toBeNull();
  });

  it("parses product types, instruments, holdings, and analysis csv", () => {
    const productTypes = parseIdecoProductTypesCsv(`商品タイプ\n国内株式\n海外株式\n`);
    expect(productTypes.rows).toHaveLength(2);

    const instruments = parseIdecoInstrumentsCsv(
      `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,フルネーム,eMAXIS Slim 国内株式(TOPIX),三菱UFJアセットマネジメント,0.143以内,0
`,
    );
    expect(instruments.rows[0]).toMatchObject({
      shortName: "eMAXIS Slim 国内株式(TOPIX)",
      productTypeCode: "domestic_equity",
    });

    const holdings = parseIdecoHoldingsCsv(HOLDINGS_CSV);
    expect(holdings.asOfDate).toBe("2026-06-02");
    expect(holdings.rows[0]).toMatchObject({
      instrumentName: "eMAXIS Slim 国内株式(TOPIX)",
      marketValueMinor: 130962,
      bookValueMinor: 128324,
      unrealizedGainMinor: 2638,
      unrealizedGainRate: 0.021,
    });
    expect(holdings.rows[1].unrealizedGainRate).toBe(0.033);

    const analysis = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名,,,,,,商品タイプ,地域分類,資産分類
商品タイプ,すべて,all,,,,,,国内株式,国内,株式
`,
    );
    expect(analysis.mappings[0].productTypeCode).toBe("domestic_equity");
    expect(analysis.axes.map((axis) => axis.axisName)).toEqual([
      "地域分類",
      "資産分類",
    ]);
  });

  it("parses modern three-column analysis csv", () => {
    const analysis = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
資産分類,株式,国内株式
商品分類,国内株式,国内株式
商品グループ,主要資産,国内株式
`,
    );
    expect(analysis.productTypeAxisName).toBe("商品タイプ");
    expect(analysis.axes.map((axis) => axis.axisName)).toEqual([
      "商品タイプ",
      "地域分類",
      "資産分類",
      "商品分類",
      "商品グループ",
    ]);
    expect(
      analysis.axes.find((axis) => axis.axisName === "商品タイプ")?.schemeCode,
    ).toBe("ideco_product_type");
    expect(analysis.memberMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schemeCode: "ideco_product_group",
          memberName: "国内株式",
          categoryName: "主要資産",
        }),
      ]),
    );
  });

  it("uses sentinel row axis name as product type display label", () => {
    const analysis = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
すべて,すべて,all
地域分類,国内,国内株式
資産分類,株式,国内株式
`,
    );
    expect(analysis.productTypeAxisName).toBe("すべて");
    expect(analysis.axes[0]).toEqual({
      axisName: "すべて",
      schemeCode: "ideco_product_type",
      sortOrder: 0,
    });
  });

  it("parses analysis csv with major asset axis and unknown axes", () => {
    const analysis = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
地域分類,海外,海外株式
資産分類,株式,国内株式
資産分類,株式,海外株式
主要資産,国内株式,国内株式
主要資産,海外株式,海外株式
商品グループ,主要資産,国内株式
商品グループ,主要資産,海外株式
カスタム軸,テストカテゴリ,国内株式
`,
    );

    expect(analysis.axes.map((axis) => axis.axisName)).toEqual([
      "商品タイプ",
      "地域分類",
      "資産分類",
      "主要資産",
      "商品グループ",
      "カスタム軸",
    ]);
    expect(
      analysis.axes.find((axis) => axis.axisName === "主要資産")?.schemeCode,
    ).toBe(`ideco_axis_${stableIdecoCodeSuffix("主要資産")}`);
    expect(
      analysis.axes.find((axis) => axis.axisName === "カスタム軸")?.schemeCode,
    ).toBe(`ideco_axis_${stableIdecoCodeSuffix("カスタム軸")}`);
    expect(analysis.memberMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          axisName: "主要資産",
          memberName: "国内株式",
          categoryName: "国内株式",
          categoryCode: "domestic_equity",
        }),
        expect.objectContaining({
          axisName: "カスタム軸",
          memberName: "国内株式",
          categoryName: "テストカテゴリ",
          categoryCode: stableIdecoCodeSuffix("テストカテゴリ"),
        }),
      ]),
    );
    expect(() => resolveIdecoAnalysisAxisSchemeCode("未知の軸")).not.toThrow();
  });

  it("parses holdings csv with multiple as-of dates", () => {
    const parsed = parseIdecoHoldingsCsvByDate(
      `${HOLDINGS_CSV.trim()}
3,2026/6/7,eMAXIS Slim 国内株式(TOPIX),"31,418","41,773","131,242","128,324","2,918",0.023
`,
    );
    expect(parsed.snapshots).toHaveLength(2);
    expect(parsed.snapshots[0].asOfDate).toBe("2026-06-02");
    expect(parsed.snapshots[1].asOfDate).toBe("2026-06-07");
    expect(parsed.snapshots[1].rows).toHaveLength(1);
    expect(() => parseIdecoHoldingsCsv(
      `${HOLDINGS_CSV.trim()}
3,2026/6/7,eMAXIS Slim 国内株式(TOPIX),"31,418","41,773","131,242","128,324","2,918",0.023
`,
    )).toThrow(/複数の基準日/);
  });

  it("rejects invalid holdings csv", () => {
    expect(() => parseIdecoHoldingsCsv("")).toThrow(IdecoCsvError);
    expect(() => parseIdecoDate("bad")).toThrow(IdecoCsvError);
    expect(() =>
      parseIdecoHoldingsCsv(
        `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,テスト,"1","0","1","1","0",0.021
`,
      ),
    ).toThrow(/残高数量が不正/);
  });

  it("parses ideco generic csv", () => {
    const parsed = parseIdecoGenericCsv(`汎用名,汎用値
拠出金累計,"2,716,679"
`);
    expect(parsed.metrics).toEqual([
      {
        code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
        integerValue: 2_716_679,
      },
    ]);
  });

  it("rejects unknown generic csv labels", () => {
    expect(() =>
      parseIdecoGenericCsv(`汎用名,汎用値
不明な項目,100
`),
    ).toThrow(IdecoCsvError);
  });

  it("parses ideco fixture directory csv when present", () => {
    const fixtureDir = resolve(import.meta.dirname, "../../../data/imports/ideco");
    const holdingsPath = resolve(fixtureDir, "明細.csv");

    let content = "";
    try {
      content = readFileSync(holdingsPath, "utf8");
    } catch {
      return;
    }

    if (content.includes("\uFFFD")) {
      return;
    }

    const parsed = parseIdecoHoldingsCsvByDate(content);
    expect(parsed.snapshots.length).toBeGreaterThan(0);
  });
});
