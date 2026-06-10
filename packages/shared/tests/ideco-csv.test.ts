import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  resolveIdecoAnalysisAxisSchemeCode,
  resolveIdecoAnalysisCategoryDefinition,
  resolveIdecoAnalysisTags,
  resolveIdecoInstrumentStatus,
  resolveIdecoMajorCategory,
  resolveIdecoProductStyle,
  resolveIdecoProductType,
  isIdecoAnalysisSchemeCode,
  productTypeCodeFromName,
  tryResolveIdecoClassificationByName,
  IDECO_SCHEME_CODES,
} from "../src/ideco-analysis";
import { parseIdecoAnalysisCsv, __idecoAnalysisCsvTesting } from "../src/ideco-analysis-csv";
import {
  IdecoCsvError,
  parseCsvRecords,
  parseDecimalRate,
  parseGainRate,
  parseIdecoDate,
  parseJapaneseInteger,
  parseJapanesePercentRate,
  stableIdecoCodeSuffix,
  stripUtf8Bom,
} from "../src/ideco-csv-utils";
import * as idecoCsvUtils from "../src/ideco-csv-utils";
import { parseIdecoGenericCsv } from "../src/ideco-generic-csv";
import {
  IDECO_HOLDINGS_CSV_HEADERS,
  parseIdecoHoldingsCsv,
  parseIdecoHoldingsCsvByDate,
} from "../src/ideco-holdings-csv";
import {
  IDECO_INSTRUMENTS_CSV_HEADERS,
  parseIdecoInstrumentsCsv,
} from "../src/ideco-instruments-csv";
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

  it("parses csv utility helpers and edge cases", () => {
    expect(parseJapaneseInteger("")).toBeNaN();
    expect(parseJapaneseInteger("-")).toBeNaN();
    expect(parseJapanesePercentRate("1.5")).toBeNaN();
    expect(parseJapanesePercentRate("-")).toBeNaN();
    expect(parseDecimalRate("-")).toBeNaN();
    expect(parseGainRate("bad")).toBeNaN();
    expect(parseCsvRecords('a,"b""c"\r\n')).toEqual([["a", 'b"c']]);
    expect(parseCsvRecords("a,b\n\n")).toEqual([["a", "b"]]);
    expect(stripUtf8Bom("plain")).toBe("plain");
    expect(productTypeCodeFromName("国内株式")).toBe("domestic_equity");
    expect(isIdecoAnalysisSchemeCode("region")).toBe(false);
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.majorCategory)).toBe(false);
    expect(isIdecoAnalysisSchemeCode(IDECO_SCHEME_CODES.region)).toBe(true);
    expect(resolveIdecoAnalysisAxisSchemeCode("")).toBe("");
    expect(tryResolveIdecoClassificationByName("")).toBeNull();
    expect(tryResolveIdecoClassificationByName("主要資産")?.code).toBe("major_assets");
    expect(tryResolveIdecoClassificationByName("国内")?.code).toBe("domestic");
    expect(tryResolveIdecoClassificationByName("株式")?.code).toBe("equity");
    expect(() => resolveIdecoProductType("未知")).toThrow(IdecoCsvError);
    expect(() => resolveIdecoMajorCategory("未知")).toThrow(IdecoCsvError);
    expect(resolveIdecoProductStyle("")).toBeNull();
    expect(() => resolveIdecoProductStyle("未知")).toThrow(IdecoCsvError);
    expect(resolveIdecoInstrumentStatus("")).toBeNull();
    expect(() => resolveIdecoInstrumentStatus("未知")).toThrow(IdecoCsvError);
    expect(() =>
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.region, "すべて"),
    ).toThrow(IdecoCsvError);
    expect(
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.region, "国内").code,
    ).toBe("domestic");
    expect(
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.assetClass, "株式").code,
    ).toBe("equity");
    expect(
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.productGroup, "主要資産").code,
    ).toBe("major_assets");
    expect(
      resolveIdecoAnalysisCategoryDefinition(
        `ideco_axis_${stableIdecoCodeSuffix("カスタム")}`,
        "カスタムカテゴリ",
      ).code,
    ).toBe(stableIdecoCodeSuffix("カスタムカテゴリ"));
    expect(
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.productCategory, "国内株式").code,
    ).toBe("domestic_equity");
    expect(
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.productType, "国内株式").code,
    ).toBe("domestic_equity");
    expect(() =>
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.productGroup, "未知"),
    ).toThrow(/商品グループ/);
    expect(() =>
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.region, "未知"),
    ).toThrow(/地域分類/);
    expect(() =>
      resolveIdecoAnalysisCategoryDefinition(IDECO_SCHEME_CODES.assetClass, "未知"),
    ).toThrow(/資産分類/);
    expect(parseJapanesePercentRate("bad%")).toBeNaN();
    expect(parseJapanesePercentRate("-%")).toBeNaN();
  });

  it("rejects invalid generic, product type, instrument, holdings, and analysis csv", () => {
    expect(() => parseIdecoGenericCsv("")).toThrow(/空です/);
    expect(() => parseIdecoGenericCsv("汎用名,汎用値\n")).toThrow(/データ行がありません/);
    expect(() => parseIdecoGenericCsv("bad,header\nx,1\n")).toThrow(/ヘッダーが不正/);
    expect(() =>
      parseIdecoGenericCsv(`汎用名,汎用値
拠出金累計,"1,000"
拠出金累計,"2,000"
`),
    ).toThrow(/重複/);
    expect(() =>
      parseIdecoGenericCsv(`汎用名,汎用値
拠出金累計,bad
`),
    ).toThrow(/汎用値が不正/);
    expect(() =>
      parseIdecoGenericCsv(`汎用名,汎用値
,
`),
    ).toThrow(/有効な行がありません/);

    expect(() => parseIdecoProductTypesCsv("")).toThrow(/空です/);
    expect(() => parseIdecoProductTypesCsv("bad\nx\n")).toThrow(/ヘッダーが不正/);
    expect(() => parseIdecoProductTypesCsv("商品タイプ\n\n")).toThrow(/データ行がありません/);

    expect(() => parseIdecoInstrumentsCsv("")).toThrow(/空です/);
    expect(() =>
      parseIdecoInstrumentsCsv(`${IDECO_INSTRUMENTS_CSV_HEADERS.join(",")}\n`),
    ).toThrow(/データ行がありません/);
    expect(() => parseIdecoInstrumentsCsv("bad\n1\n")).toThrow(/ヘッダー/);

    expect(() => parseIdecoHoldingsCsv("")).toThrow(/空です/);
    expect(() =>
      parseIdecoHoldingsCsv(`${IDECO_HOLDINGS_CSV_HEADERS.join(",")}\n`),
    ).toThrow(/データ行がありません/);
    expect(() => parseIdecoHoldingsCsv("bad\n1\n")).toThrow(/ヘッダー/);
    expect(() =>
      parseIdecoHoldingsCsv(
        `${HOLDINGS_CSV.trim()}\n3,2026/6/7,eMAXIS Slim 国内株式(TOPIX),"31,418","41,773","131,242","128,324","2,918",0.023`,
      ),
    ).toThrow(/複数の基準日/);
    expect(() =>
      parseIdecoHoldingsCsv(
        `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,,"1","1","1","1","0",0.021
`,
      ),
    ).toThrow(/運用商品名が空/);
    expect(() =>
      parseIdecoHoldingsCsv(
        `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,テスト,"1","1","1","1","0",bad
`,
      ),
    ).toThrow(/数値が不正/);

    expect(() => parseIdecoAnalysisCsv("")).toThrow(/空です/);
    expect(() => parseIdecoAnalysisCsv("分析軸名,カテゴリ名,メンバー名\n")).toThrow(
      /データ行がありません/,
    );
    expect(() =>
      parseIdecoAnalysisCsv(`分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
`),
    ).toThrow(/有効な導出行がありません/);
  });

  it("parses legacy analysis csv and skips duplicate axes", () => {
    const legacy = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名,,,,,,商品タイプ,地域分類,資産分類
,,,,,,,,,,
商品タイプ,すべて,all,,,,,,国内株式,国内,株式
商品タイプ,すべて,all,,,,,,海外株式,海外,株式
`,
    );
    expect(legacy.mappings).toHaveLength(2);
    expect(legacy.axes.map((axis) => axis.axisName)).toEqual(["地域分類", "資産分類"]);

    const modern = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
地域分類,国内,国内株式
`,
    );
    expect(modern.axes.filter((axis) => axis.axisName === "地域分類")).toHaveLength(1);

    const skippedRows = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
,国内,国内株式
地域分類,国内,国内株式
`,
    );
    expect(skippedRows.memberMappings).toHaveLength(1);

    expect(() =>
      parseIdecoAnalysisCsv(
        `分析軸名,カテゴリ名,メンバー名,,,,,,商品タイプ,地域分類,資産分類
,,,,,,,,,,
`,
      ),
    ).toThrow(/有効な導出行がありません/);

    expect(() =>
      parseIdecoAnalysisCsv(
        `分析軸名,wrong,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
`,
      ),
    ).toThrow(/ヘッダーが不正/);

    expect(
      __idecoAnalysisCsvTesting.isLegacyAnalysisHeader([
        "分析軸名",
        "カテゴリ名",
        "メンバー名",
        "",
        "",
        "",
        "",
        "",
        "wrong",
        "地域分類",
        "資産分類",
      ]),
    ).toBe(false);

    expect(() =>
      __idecoAnalysisCsvTesting.assertHeader(
        ["分析軸名", "カテゴリ名", "メンバー名"],
        __idecoAnalysisCsvTesting.IDECO_ANALYSIS_CSV_HEADERS,
        "新形式",
      ),
    ).not.toThrow();

    const sparseLegacyHeader: string[] = [];
    sparseLegacyHeader.length = 11;
    sparseLegacyHeader[9] = "地域分類";
    sparseLegacyHeader[10] = "資産分類";
    expect(__idecoAnalysisCsvTesting.isLegacyAnalysisHeader(sparseLegacyHeader)).toBe(false);

    expect(() =>
      __idecoAnalysisCsvTesting.assertHeader(
        Object.assign(["分析軸名", "カテゴリ名"], { length: 3 }),
        __idecoAnalysisCsvTesting.IDECO_ANALYSIS_CSV_HEADERS,
        "新形式",
      ),
    ).toThrow(/ヘッダーが不正/);

    const axes: ReturnType<typeof parseIdecoAnalysisCsv>["axes"] = [];
    const axisNames: string[] = [];
    __idecoAnalysisCsvTesting.pushAxis(axes, axisNames, "  ");
    expect(axes).toHaveLength(0);

    const legacyWithShortRow = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名,,,,,,商品タイプ,地域分類,資産分類
,,,,,,,
商品タイプ,すべて,all,,,,,,国内株式,国内,株式
`,
    );
    expect(legacyWithShortRow.mappings).toHaveLength(1);
  });

  it("parses instruments csv with status and rejects invalid rows", () => {
    const parsed = parseIdecoInstrumentsCsv(
      `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,除外手続中,フルネーム,eMAXIS Slim 国内株式(TOPIX),会社,0.143以内,0
`,
    );
    expect(parsed.rows[0]?.statusCode).toBe("exclusion_pending");

    expect(() =>
      parseIdecoInstrumentsCsv(
        `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
0,投資信託,国内株式,パッシブ,,フルネーム,,会社,0,0
`,
      ),
    ).toThrow(/No\. が不正/);
    expect(() =>
      parseIdecoInstrumentsCsv(
        `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,,eMAXIS Slim 国内株式(TOPIX),会社,0,0
`,
      ),
    ).toThrow(/運用商品名が空/);
    expect(() =>
      parseIdecoInstrumentsCsv(
        `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,フルネーム,,会社,0,0
`,
      ),
    ).toThrow(/運用商品名\(略称\)が空/);
    expect(() =>
      parseIdecoInstrumentsCsv(
        `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,フルネーム,eMAXIS Slim 国内株式(TOPIX),会社,0,0,extra
`,
      ),
    ).toThrow(/列数が不正/);
    expect(() =>
      parseIdecoInstrumentsCsv(
        `bad,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,フルネーム,eMAXIS Slim 国内株式(TOPIX),会社,0,0
`,
      ),
    ).toThrow(/ヘッダー/);

    expect(() =>
      parseIdecoHoldingsCsv(
        `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
0,2026/6/2,テスト,"1","1","1","1","0",0.021
`,
      ),
    ).toThrow(/番号が不正/);
    expect(() =>
      parseIdecoHoldingsCsv(
        `bad,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,テスト,"1","1","1","1","0",0.021
`,
      ),
    ).toThrow(/ヘッダー/);
    expect(() => parseIdecoHoldingsCsvByDate("")).toThrow(/空です/);

    expect(() => parseIdecoProductTypesCsv("bad\n国内株式\n")).toThrow(/ヘッダー/);
    expect(() =>
      parseIdecoProductTypesCsv(`商品タイプ\n\n`),
    ).toThrow(/データ行がありません/);
  });

  it("covers remaining analysis, holdings, and product type csv branches", () => {
    expect(() =>
      parseIdecoAnalysisCsv(
        `分析軸名,カテゴリ名,メンバー名
`,
      ),
    ).toThrow(/データ行がありません/);

    expect(() =>
      parseIdecoAnalysisCsv(
        `分析軸名,カテゴリ名,メンバー名,,,,,,商品タイプ,地域分類,資産分類
商品タイプ,すべて,all,,,,,,国内株式,,
`,
      ),
    ).toThrow(/地域分類または資産分類が空/);

    expect(() =>
      parseIdecoAnalysisCsv(
        `分析軸名,カテゴリ名,メンバー名
`,
      ),
    ).toThrow(/データ行がありません/);

    expect(() =>
      parseIdecoAnalysisCsv(
        `分析軸名,カテゴリ名
商品タイプ,すべて,all
`,
      ),
    ).toThrow(/ヘッダー列数が不正/);

    const duplicateSentinel = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
商品タイプ,すべて,all
地域分類,国内,国内株式
`,
    );
    expect(
      duplicateSentinel.axes.filter((axis) => axis.schemeCode === IDECO_SCHEME_CODES.productType),
    ).toHaveLength(1);

    const modernWithoutLegacyMapping = parseIdecoAnalysisCsv(
      `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
`,
    );
    expect(modernWithoutLegacyMapping.mappings).toHaveLength(0);

    expect(() => parseIdecoProductTypesCsv(`商品タイプ\n,\n`)).toThrow(/有効な行がありません/);
    expect(() => parseIdecoProductTypesCsv(`wrong\n国内株式\n`)).toThrow(/ヘッダーが不正/);

    expect(() =>
      parseIdecoHoldingsCsv(
        `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,テスト,"1","1","1","1","0",0.021,extra
`,
      ),
    ).toThrow(/列数が不正/);

    expect(
      parseIdecoGenericCsv(`汎用名,汎用値
,100
拠出金累計,"1,000"
`).metrics,
    ).toHaveLength(1);

    const parseSpy = vi.spyOn(idecoCsvUtils, "parseCsvRecords");
    parseSpy.mockReturnValueOnce([
      ["商品タイプ"],
      ["国内株式"],
    ]);
    expect(parseIdecoProductTypesCsv("mocked").rows).toHaveLength(1);

    parseSpy.mockReturnValueOnce([
      ["商品タイプ"],
      [],
    ]);
    expect(() => parseIdecoProductTypesCsv("mocked")).toThrow(/有効な行がありません/);

    parseSpy.mockReturnValueOnce([[], ["国内株式"]]);
    expect(() => parseIdecoProductTypesCsv("mocked")).toThrow(/ヘッダーが不正/);

    parseSpy.mockReturnValueOnce([
      ["汎用名", "汎用値"],
      [],
      ["拠出金累計", "1000"],
    ]);
    expect(parseIdecoGenericCsv("mocked").metrics).toHaveLength(1);

    parseSpy.mockReturnValueOnce([
      ["分析軸名", "カテゴリ名", "メンバー名"],
      ["商品タイプ", "すべて", "all"],
      ["地域分類", "国内", "国内株式"],
      ["資産分類", "株式", "国内株式"],
    ]);
    expect(parseIdecoAnalysisCsv("mocked").memberMappings.length).toBeGreaterThan(0);

    parseSpy.mockReturnValueOnce([
      ["分析軸名", "カテゴリ名", "メンバー名", "", "", "", "", "", "商品タイプ", "地域分類", "資産分類"],
      ["", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "国内株式", "国内", "株式"],
    ]);
    expect(parseIdecoAnalysisCsv("mocked-legacy-sparse").mappings).toHaveLength(1);

    parseSpy.mockReturnValueOnce([
      ["分析軸名", "カテゴリ名", "メンバー名"],
      ["商品タイプ", "すべて", "all"],
      [],
      ["地域分類"],
      ["地域分類", "国内", "国内株式"],
      ["資産分類", "株式", "国内株式"],
    ]);
    expect(parseIdecoAnalysisCsv("mocked-modern-short").memberMappings.length).toBeGreaterThan(0);
    parseSpy.mockRestore();
  });
});
