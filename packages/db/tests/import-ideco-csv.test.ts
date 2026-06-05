import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getIdecoCurrentSnapshot,
  importIdecoKakeiboCsv,
  importIdecoKakeiboCsvFromParsed,
} from "../src/import-ideco-csv";
import { IDECO_KAKEIBO_METRIC_CODES } from "@repo/shared";
import * as classifications from "../src/repositories/classifications";
import * as snapshots from "../src/repositories/snapshots";
import { createTestDb } from "../src/test-utils";

const SAMPLE_CSV = `番号,日付,商品タイプ,運用商品名,時価単価(1万口当り),残高数量,資産残高,購入金額,損益,損益率
1,2026/6/2,国内株式,eMAXIS Slim 国内株式(TOPIX),"31,351","41,773","130,962","128,324","2,638",2.10%
2,2026/6/2,海外株式,eMAXIS Slim 全世界株式(除く日本),"38,275","104,130","398,557","385,705","12,852",3.30%
`;

describe("importIdecoKakeiboCsv", () => {
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

  it("imports parsed rows into ideco portfolio and snapshot", async () => {
    const db = setup();
    const first = await importIdecoKakeiboCsv(db, SAMPLE_CSV);
    expect(first).toMatchObject({
      asOfDate: "2026-06-02",
      lineCount: 2,
      createdInstruments: 2,
      reusedInstruments: 0,
    });

    const snapshot = await getIdecoCurrentSnapshot(db);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.lines).toHaveLength(2);
    expect(snapshot?.lines[0]).toMatchObject({
      sortOrder: 1,
      instrumentName: "eMAXIS Slim 国内株式(TOPIX)",
      quantity: 41773,
      marketValueMinor: 130962000,
      bookValueMinor: 128324000,
    });
    expect(snapshot?.lines[0].metrics).toEqual(
      expect.arrayContaining([
        {
          code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
          integerValue: 31351,
          realValue: null,
          textValue: null,
        },
        {
          code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
          integerValue: 2638000,
          realValue: null,
          textValue: null,
        },
        {
          code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
          integerValue: null,
          realValue: 0.021,
          textValue: null,
        },
      ]),
    );
    expect(snapshot?.lines[0].tags).toEqual([
      {
        schemeCode: "ideco_product_type",
        schemeName: "商品タイプ",
        valueCode: "domestic_equity",
        valueName: "国内株式",
      },
    ]);

    const second = await importIdecoKakeiboCsv(db, SAMPLE_CSV);
    expect(second).toMatchObject({
      createdInstruments: 0,
      reusedInstruments: 2,
    });
  });

  it("returns null when product type scheme cannot be ensured", async () => {
    const db = setup();
    vi.spyOn(
      classifications,
      "findSchemeByPortfolioCodeAndSchemeCode",
    ).mockResolvedValueOnce(null);
    vi.spyOn(classifications, "createClassificationScheme").mockResolvedValueOnce(
      null,
    );

    const outcome = await importIdecoKakeiboCsvFromParsed(db, {
      asOfDate: "2026-06-02",
      rows: [],
    });
    expect(outcome).toBeNull();
    vi.restoreAllMocks();
  });

  it("returns null when snapshot replace fails", async () => {
    const db = setup();
    vi.spyOn(snapshots, "replaceCurrentSnapshot").mockResolvedValueOnce(null);

    const outcome = await importIdecoKakeiboCsvFromParsed(db, {
      asOfDate: "2026-06-02",
      rows: [
        {
          rowNumber: 1,
          asOfDate: "2026-06-02",
          productTypeName: "国内株式",
          productTypeCode: "domestic_equity",
          instrumentName: "テスト",
          unitPricePerTenThousandLots: 1,
          quantity: 1,
          marketValueMinor: 1000,
          bookValueMinor: 1000,
          unrealizedGainMinor: 0,
          unrealizedGainRate: 0,
        },
      ],
    });
    expect(outcome).toBeNull();
    vi.restoreAllMocks();
  });

  it("returns null when classification value cannot be resolved", async () => {
    const db = setup();
    const outcome = await importIdecoKakeiboCsvFromParsed(db, {
      asOfDate: "2026-06-02",
      rows: [
        {
          rowNumber: 1,
          asOfDate: "2026-06-02",
          productTypeName: "国内株式",
          productTypeCode: "missing_code",
          instrumentName: "テスト",
          unitPricePerTenThousandLots: 1,
          quantity: 1,
          marketValueMinor: 1000,
          bookValueMinor: 1000,
          unrealizedGainMinor: 0,
          unrealizedGainRate: 0,
        },
      ],
    });
    expect(outcome).toBeNull();
  });
});
