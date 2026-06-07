import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  IDECO_INSTRUMENT_ATTRIBUTE_CODES,
  IDECO_KAKEIBO_METRIC_CODES,
  IDECO_SCHEME_CODES,
} from "@repo/shared";

import {
  getIdecoCurrentSnapshot,
  importIdecoData,
} from "../src/import-ideco-data";
import {
  findClassificationValueBySchemeAndCode,
  findSchemeByPortfolioCodeAndSchemeCode,
  listAnalysisSchemesForPortfolio,
} from "../src/repositories/classifications";
import { createTestDb } from "../src/test-utils";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures/ideco");

function readFixture(name: string): string {
  let result = readFileSync(resolve(FIXTURE_DIR, name), "utf8");
  return result;
}

describe("importIdecoData", () => {
  const instances: ReturnType<typeof createTestDb>[] = [];

  afterEach(() => {
    for (const instance of instances) {
      instance.sqlite.close();
    }
    instances.length = 0;
  });

  function setup() {
    const instance = createTestDb();
    instances.push(instance);
    return instance.db;
  }

  it("imports ideco directory fixtures into portfolio and snapshot", async () => {
    const db = setup();
    const first = await importIdecoData(db, {
      productTypesCsv: readFixture("商品タイプ.csv"),
      analysisCsv: readFixture("分析.csv"),
      instrumentsCsv: readFixture("銘柄の情報.csv"),
      holdingsCsv: readFixture("明細.csv"),
    });

    expect(first).toMatchObject({
      asOfDate: "2026-06-02",
      lineCount: 2,
      instrumentCount: 2,
      createdInstruments: 2,
      reusedInstruments: 0,
    });

    const snapshot = await getIdecoCurrentSnapshot(db);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.lines).toHaveLength(2);
    expect(snapshot?.lines[0]).toMatchObject({
      sortOrder: 1,
      instrumentName: "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）",
      quantity: 41773,
      marketValueMinor: 130962,
      bookValueMinor: 128324,
    });
    expect(snapshot?.lines[0].metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
          realValue: 0.021,
        }),
      ]),
    );
    expect(snapshot?.lines[0].instrumentAttributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: IDECO_INSTRUMENT_ATTRIBUTE_CODES.shortName,
          textValue: "eMAXIS Slim 国内株式(TOPIX)",
        }),
      ]),
    );
    expect(snapshot?.lines[0].tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schemeCode: IDECO_SCHEME_CODES.productType,
          valueCode: "domestic_equity",
        }),
        expect.objectContaining({
          schemeCode: IDECO_SCHEME_CODES.region,
          valueCode: "domestic",
        }),
        expect.objectContaining({
          schemeCode: IDECO_SCHEME_CODES.assetClass,
          valueCode: "equity",
        }),
      ]),
    );

    const second = await importIdecoData(db, {
      productTypesCsv: readFixture("商品タイプ.csv"),
      analysisCsv: readFixture("分析.csv"),
      instrumentsCsv: readFixture("銘柄の情報.csv"),
      holdingsCsv: readFixture("明細.csv"),
    });
    expect(second).toMatchObject({
      createdInstruments: 0,
      reusedInstruments: 2,
    });
  });

  it("returns null when holdings reference unknown short name", async () => {
    const db = setup();
    const outcome = await importIdecoData(db, {
      productTypesCsv: readFixture("商品タイプ.csv"),
      analysisCsv: readFixture("分析.csv"),
      instrumentsCsv: readFixture("銘柄の情報.csv"),
      holdingsCsv: `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,存在しない銘柄,"1","1","1","1","0",0.021
`,
    });
    expect(outcome).toBeNull();
  });

  it("applies product type axis display name from analysis csv sentinel row", async () => {
    const db = setup();
    const analysisCsv = `分析軸名,カテゴリ名,メンバー名
すべて,すべて,all
地域分類,国内,国内株式
資産分類,株式,国内株式
`;
    const outcome = await importIdecoData(db, {
      productTypesCsv: readFixture("商品タイプ.csv"),
      analysisCsv,
      instrumentsCsv: readFixture("銘柄の情報.csv"),
      holdingsCsv: readFixture("明細.csv"),
    });
    expect(outcome).not.toBeNull();

    const productTypeScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.productType,
    );
    expect(productTypeScheme?.name).toBe("すべて");

    const snapshot = await getIdecoCurrentSnapshot(db);
    expect(snapshot?.analysisSchemes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schemeCode: IDECO_SCHEME_CODES.productType,
          schemeName: "すべて",
        }),
      ]),
    );
  });

  it("removes analysis schemes and values that disappear from csv", async () => {
    const db = setup();
    const baseFiles = {
      productTypesCsv: readFixture("商品タイプ.csv"),
      instrumentsCsv: readFixture("銘柄の情報.csv"),
      holdingsCsv: readFixture("明細.csv"),
    };
    const fullAnalysisCsv = `分析軸名,カテゴリ名,メンバー名
地域分類,国内,国内株式
資産分類,株式,国内株式
商品グループ,主要資産,国内株式
`;
    const reducedAnalysisCsv = `分析軸名,カテゴリ名,メンバー名
地域分類,国内,国内株式
`;

    const first = await importIdecoData(db, {
      ...baseFiles,
      analysisCsv: fullAnalysisCsv,
    });
    expect(first).not.toBeNull();

    let assetClassScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.assetClass,
    );
    expect(assetClassScheme).not.toBeNull();

    let productGroupScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.productGroup,
    );
    expect(productGroupScheme).not.toBeNull();

    const second = await importIdecoData(db, {
      ...baseFiles,
      analysisCsv: reducedAnalysisCsv,
    });
    expect(second).not.toBeNull();

    assetClassScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.assetClass,
    );
    expect(assetClassScheme).toBeNull();

    productGroupScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.productGroup,
    );
    expect(productGroupScheme).toBeNull();

    const regionScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.region,
    );
    expect(regionScheme).not.toBeNull();

    const foreignRegion = await findClassificationValueBySchemeAndCode(
      db,
      regionScheme!.id,
      "foreign",
    );
    expect(foreignRegion).toBeNull();

    const analysisSchemes = await listAnalysisSchemesForPortfolio(db, "ideco");
    expect(analysisSchemes.map((scheme) => scheme.schemeCode)).toEqual([
      IDECO_SCHEME_CODES.productType,
      IDECO_SCHEME_CODES.region,
    ]);
  });

  it("removes product types that disappear from csv", async () => {
    const db = setup();
    const domesticInstrumentCsv = `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）,eMAXIS Slim 国内株式(TOPIX),三菱UFJアセットマネジメント,0.143以内,0
`;
    const domesticHoldingsCsv = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,eMAXIS Slim 国内株式(TOPIX),"31351","41773","130962","128324","2638","0.021"
`;
    const baseFiles = {
      analysisCsv: readFixture("分析.csv"),
    };

    await importIdecoData(db, {
      ...baseFiles,
      productTypesCsv: `商品タイプ\n国内株式\n海外株式\n`,
      instrumentsCsv: domesticInstrumentCsv,
      holdingsCsv: domesticHoldingsCsv,
    });

    const productTypeScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.productType,
    );
    expect(productTypeScheme).not.toBeNull();

    let foreignEquity = await findClassificationValueBySchemeAndCode(
      db,
      productTypeScheme!.id,
      "foreign_equity",
    );
    expect(foreignEquity).not.toBeNull();

    await importIdecoData(db, {
      ...baseFiles,
      productTypesCsv: `商品タイプ\n国内株式\n`,
      instrumentsCsv: domesticInstrumentCsv,
      holdingsCsv: domesticHoldingsCsv,
    });

    foreignEquity = await findClassificationValueBySchemeAndCode(
      db,
      productTypeScheme!.id,
      "foreign_equity",
    );
    expect(foreignEquity).toBeNull();
  });
});
