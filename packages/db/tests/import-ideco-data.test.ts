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
});
