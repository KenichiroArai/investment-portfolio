import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as shared from "@repo/shared";
import {
  IDECO_INSTRUMENT_ATTRIBUTE_CODES,
  IDECO_KAKEIBO_METRIC_CODES,
  IDECO_PORTFOLIO_METRIC_CODES,
  IDECO_SCHEME_CODES,
  IdecoCsvError,
  parseIdecoGenericCsv,
} from "@repo/shared";

import {
  __importIdecoTesting,
  getIdecoCurrentSnapshot,
  importIdecoData,
} from "../src/import-ideco-data";
import * as classificationsRepo from "../src/repositories/classifications";
import * as instrumentsRepo from "../src/repositories/instruments";
import { getSnapshotByDate, listSnapshotDates } from "../src/repositories/snapshots";
import * as snapshotsRepo from "../src/repositories/snapshots";
import {
  findClassificationValueBySchemeAndCode,
  findSchemeByPortfolioCodeAndSchemeCode,
  listAnalysisSchemesForPortfolio,
  updateClassificationSchemeName,
} from "../src/repositories/classifications";
import { createTestDb } from "../src/test-utils";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures/ideco");

function readFixture(name: string): string {
  let result = readFileSync(resolve(FIXTURE_DIR, name), "utf8");
  return result;
}

function readIdecoImportFiles(
  overrides: Partial<{
    productTypesCsv: string;
    analysisCsv: string;
    instrumentsCsv: string;
    holdingsCsv: string;
    genericCsv: string;
  }> = {},
) {
  let result = {
    productTypesCsv: readFixture("商品タイプ.csv"),
    analysisCsv: readFixture("分析.csv"),
    instrumentsCsv: readFixture("銘柄の情報.csv"),
    holdingsCsv: readFixture("明細.csv"),
    genericCsv: readFixture("汎用.csv"),
    ...overrides,
  };
  return result;
}

describe("importIdecoData", () => {
  const instances: ReturnType<typeof createTestDb>[] = [];
  const spies: Array<{ mockRestore: () => void }> = [];

  afterEach(() => {
    for (const spy of spies) {
      spy.mockRestore();
    }
    spies.length = 0;
    for (const instance of instances) {
      instance.sqlite.close();
    }
    instances.length = 0;
  });

  function trackSpy<T extends { mockRestore: () => void }>(spy: T): T {
    spies.push(spy);
    return spy;
  }

  function setup() {
    const instance = createTestDb();
    instances.push(instance);
    return instance.db;
  }

  it("imports ideco directory fixtures into portfolio and snapshot", async () => {
    const db = setup();
    const first = await importIdecoData(db, readIdecoImportFiles());

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
    expect(snapshot?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
          integerValue: 9_999_999,
        }),
      ]),
    );

    const second = await importIdecoData(db, readIdecoImportFiles());
    expect(second).toMatchObject({
      createdInstruments: 0,
      reusedInstruments: 2,
    });
  });

  it("imports multiple as-of dates from holdings csv", async () => {
    const db = setup();
    const holdingsCsv = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,eMAXIS Slim 国内株式(TOPIX),"31351","41773","130962","128324","2638","0.021"
2,2026/06/07,eMAXIS Slim 全世界株式(除く日本),"38275","104130","398557","385705","12852","0.033"
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({
        holdingsCsv,
      }),
    );
    expect(outcome).toMatchObject({
      asOfDate: "2026-06-07",
      lineCount: 1,
    });

    const current = await getIdecoCurrentSnapshot(db);
    expect(current?.asOfDate).toBe("2026-06-07");
    const dates = await listSnapshotDates(db, "ideco");
    expect(dates.map((item) => item.asOfDate)).toEqual([
      "2026-06-07",
      "2026-06-02",
    ]);
    const older = await getSnapshotByDate(db, "ideco", "2026-06-02");
    expect(older?.lines).toHaveLength(1);
    expect(older?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
          integerValue: 9_999_999,
        }),
      ]),
    );
  });

  it("rejects holdings csv with duplicate instrument names on the same date", async () => {
    const db = setup();
    const holdingsCsv = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,eMAXIS Slim 国内株式(TOPIX),"31351","41773","130962","128324","2638","0.021"
2,2026/06/02,eMAXIS Slim 国内株式(TOPIX),"31351","41773","130962","128324","2638","0.021"
`;

    await expect(
      importIdecoData(
        db,
        readIdecoImportFiles({
          holdingsCsv,
        }),
      ),
    ).rejects.toThrow(IdecoCsvError);
  });

  it("returns null when holdings reference unknown short name", async () => {
    const db = setup();
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({
        holdingsCsv: `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,存在しない銘柄,"1","1","1","1","0",0.021
`,
      }),
    );
    expect(outcome).toBeNull();
  });

  it("applies product type axis display name from analysis csv sentinel row", async () => {
    const db = setup();
    const analysisCsv = `分析軸名,カテゴリ名,メンバー名
すべて,すべて,all
地域分類,国内,国内株式
資産分類,株式,国内株式
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({
        analysisCsv,
      }),
    );
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
    const baseFiles = readIdecoImportFiles();
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
    const baseFiles = readIdecoImportFiles();

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

  it("updates existing classification value sort order on reimport", async () => {
    const db = setup();
    const firstAnalysisCsv = `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
地域分類,海外,海外株式
`;
    const secondAnalysisCsv = `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,海外,海外株式
地域分類,国内,国内株式
`;

    const first = await importIdecoData(
      db,
      readIdecoImportFiles({ analysisCsv: firstAnalysisCsv }),
    );
    expect(first).not.toBeNull();

    const regionScheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.region,
    );
    const domesticBefore = await findClassificationValueBySchemeAndCode(
      db,
      regionScheme!.id,
      "domestic",
    );
    expect(domesticBefore?.sortOrder).toBe(0);

    const second = await importIdecoData(
      db,
      readIdecoImportFiles({ analysisCsv: secondAnalysisCsv }),
    );
    expect(second).not.toBeNull();

    const domesticAfter = await findClassificationValueBySchemeAndCode(
      db,
      regionScheme!.id,
      "domestic",
    );
    expect(domesticAfter?.sortOrder).toBe(1);
  });

  it("returns null when short name attribute conflicts across instruments", async () => {
    const db = setup();
    const instrumentsCsv = `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,ファンドA,eMAXIS Slim 国内株式(TOPIX),会社A,0.143以内,0
2,投資信託,国内株式,パッシブ,,ファンドB,eMAXIS Slim 国内株式(TOPIX),会社B,0.143以内,0
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({ instrumentsCsv }),
    );
    expect(outcome).toBeNull();
  });

  it("throws when holdings csv has no data rows", async () => {
    const db = setup();
    await expect(
      importIdecoData(
        db,
        readIdecoImportFiles({
          holdingsCsv: `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
`,
        }),
      ),
    ).rejects.toThrow(/データ行がありません/);
  });

  it("resolves holdings by full instrument name", async () => {
    const db = setup();
    const instrumentsCsv = `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,パッシブ,,ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）,eMAXIS Slim 国内株式(TOPIX),三菱UFJアセットマネジメント,0.143以内,0
`;
    const holdingsCsv = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）,"31351","41773","130962","128324","2638","0.021"
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({
        instrumentsCsv,
        holdingsCsv,
      }),
    );
    expect(outcome).not.toBeNull();
    const snapshot = await getIdecoCurrentSnapshot(db);
    expect(snapshot?.lines[0]?.instrumentName).toBe(
      "ｅＭＡＸＩＳ Ｓｌｉｍ 国内株式（ＴＯＰＩＸ）",
    );
  });

  it("imports time deposit instruments as deposit type", async () => {
    const db = setup();
    const instrumentsCsv = `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,定期預金,元本確保,,,定期預金商品,定期預金略称,銀行,0,0
`;
    const holdingsCsv = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,定期預金略称,"10000","1","10000","10000","0",0
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({
        productTypesCsv: `商品タイプ\n元本確保\n`,
        instrumentsCsv,
        holdingsCsv,
      }),
    );
    expect(outcome).not.toBeNull();
  });

  it("returns null when holdings csv yields no snapshot groups", async () => {
    const db = setup();
    trackSpy(
      vi.spyOn(shared, "parseIdecoHoldingsCsvByDate").mockReturnValue({ snapshots: [] }),
    );
    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).toBeNull();
  });

  it("returns null when upsertSnapshotByDate fails during holdings import", async () => {
    const db = setup();
    trackSpy(vi.spyOn(snapshotsRepo, "upsertSnapshotByDate").mockResolvedValue(null));
    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).toBeNull();
  });

  it("returns null when upsertInstrument fails during instrument import", async () => {
    const db = setup();
    trackSpy(vi.spyOn(instrumentsRepo, "upsertInstrument").mockResolvedValue(null));
    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).toBeNull();
  });

  it("returns null when instrument classification value is missing", async () => {
    const db = setup();
    trackSpy(
      vi
        .spyOn(classificationsRepo, "findClassificationValueBySchemeAndCode")
        .mockResolvedValue(null),
    );
    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).toBeNull();
  });

  it("returns null when product type scheme cannot be created", async () => {
    const db = setup();
    trackSpy(
      vi.spyOn(classificationsRepo, "createClassificationScheme").mockResolvedValue(null),
    );
    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).toBeNull();
  });

  it("skips analysis axes that have no classification values", async () => {
    const db = setup();
    const analysisCsv = `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
カスタム軸,カテゴリ,all
地域分類,国内,国内株式
資産分類,株式,国内株式
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({ analysisCsv }),
    );
    expect(outcome).not.toBeNull();
  });

  it("imports instruments with product style and status classifications", async () => {
    const db = setup();
    const instrumentsCsv = `No.,大分類,商品タイプ,商品タイプ(スタイル),ステータス,運用商品名,運用商品名(略称),提供・委託会社,信託報酬（％）（税込）,信託財産保留額（％）
1,投資信託,国内株式,アクティブ,除外手続中,アクティブファンド,Active Style Fund,会社,0.143以内,0
`;
    const holdingsCsv = `番号,日付,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/06/02,Active Style Fund,"31351","41773","130962","128324","2638","0.021"
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({
        instrumentsCsv,
        holdingsCsv,
      }),
    );
    expect(outcome).not.toBeNull();
  });

  it("returns null when classification scheme lookup misses during tagging", async () => {
    const db = setup();
    const original = classificationsRepo.findSchemeByPortfolioCodeAndSchemeCode;
    trackSpy(
      vi
        .spyOn(classificationsRepo, "findSchemeByPortfolioCodeAndSchemeCode")
        .mockImplementation(async (database, portfolioCode, schemeCode) => {
          if (schemeCode === IDECO_SCHEME_CODES.majorCategory) {
            return null;
          }
          return original(database, portfolioCode, schemeCode);
        }),
    );
    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).toBeNull();
  });

  it("returns null from importHoldingsFromParsedByDate when snapshot groups are empty", async () => {
    const db = setup();
    const genericParsed = parseIdecoGenericCsv(readFixture("汎用.csv"));
    const outcome = await __importIdecoTesting.importHoldingsFromParsedByDate(
      db,
      { snapshots: [] },
      genericParsed,
    );
    expect(outcome).toBeNull();
  });

  it("updates existing classification scheme names during import", async () => {
    const db = setup();
    const updateSpy = trackSpy(
      vi.spyOn(classificationsRepo, "updateClassificationSchemeName"),
    );

    await importIdecoData(db, readIdecoImportFiles());

    const scheme = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "ideco",
      IDECO_SCHEME_CODES.productType,
    );
    expect(scheme).not.toBeNull();
    await updateClassificationSchemeName(db, scheme!.id, "旧商品タイプ名");
    updateSpy.mockClear();

    const outcome = await importIdecoData(db, readIdecoImportFiles());
    expect(outcome).not.toBeNull();
    expect(updateSpy).toHaveBeenCalled();
  });

  it("deduplicates duplicate analysis member mappings during instrument import", async () => {
    const db = setup();
    const analysisCsv = `分析軸名,カテゴリ名,メンバー名
商品タイプ,すべて,all
地域分類,国内,国内株式
地域分類,国内,国内株式
資産分類,株式,国内株式
`;
    const outcome = await importIdecoData(
      db,
      readIdecoImportFiles({ analysisCsv }),
    );
    expect(outcome).not.toBeNull();
  });
});
