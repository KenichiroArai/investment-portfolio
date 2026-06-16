import { afterEach, describe, expect, it } from "vitest";

import { IDECO_SCHEME_CODES, SnapshotValidationError } from "@repo/shared";

import {
  createClassificationScheme,
  createClassificationValue,
  deleteClassificationSchemeById,
  deleteClassificationValueById,
  deleteClassificationValuesBySchemeIdNotInCodes,
  findClassificationValueById,
  findClassificationValueBySchemeAndCode,
  findSchemeById,
  findSchemeByPortfolioCodeAndSchemeCode,
  getTagsForInstruments,
  listAnalysisSchemesForPortfolio,
  listClassificationSchemesByPortfolioCode,
  listInstrumentClassificationValueIds,
  listSchemesWithValuesForPortfolio,
  setInstrumentClassifications,
  updateClassificationSchemeName,
  updateClassificationValue,
} from "../src/repositories/classifications";
import {
  createInstrument,
  deleteInstrument,
  findInstrumentByAttributeTextValue,
  findInstrumentById,
  findInstrumentByName,
  getAttributesForInstruments,
  listInstruments,
  setInstrumentAttributes,
  updateInstrument,
  upsertInstrument,
} from "../src/repositories/instruments";
import {
  createPortfolio,
  deletePortfolio,
  findPortfolioByCode,
  listPortfolios,
  updatePortfolio,
} from "../src/repositories/portfolios";
import {
  getCurrentSnapshot,
  getSnapshotByDate,
  getSnapshotsInDateRange,
  listSnapshotDates,
  replaceCurrentSnapshot,
  setCurrentSnapshot,
  upsertSnapshotByDate,
} from "../src/repositories/snapshots";
import {
  listAllTargetAllocationsForPortfolio,
  listTargetAllocationWeights,
  replaceTargetAllocationWeights,
} from "../src/repositories/target-allocations";
import {
  listTargetPortfolioWeights,
  replaceTargetPortfolioWeights,
} from "../src/repositories/target-portfolio-weights";
import { createTestDb } from "../src/test-utils";

describe("portfolio repositories", () => {
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

  it("creates portfolio and returns null for unknown code", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const rows = await listPortfolios(db);
    expect(rows).toHaveLength(1);
    const missing = await getCurrentSnapshot(db, "unknown");
    expect(missing).toBeNull();
    const noSnapshot = await getCurrentSnapshot(db, "ideco");
    expect(noSnapshot).toBeNull();
  });

  it("returns null for unknown portfolio scheme lookup", async () => {
    const db = setup();
    const missing = await findSchemeByPortfolioCodeAndSchemeCode(
      db,
      "missing",
      "region",
    );
    expect(missing).toBeNull();
  });

  it("returns null when replacing snapshot for unknown portfolio", async () => {
    const db = setup();
    const replaced = await replaceCurrentSnapshot(db, {
      portfolioCode: "missing",
      asOfDate: "2026-06-01",
      lines: [],
    });
    expect(replaced).toBeNull();
  });

  it("supports classification tags and current snapshot replace", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    const scheme = await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: "region",
      name: "地域",
    });
    expect(scheme).not.toBeNull();

    const valueJapan = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "japan",
      name: "日本",
      sortOrder: 0,
    });
    const valueOverseas = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "overseas",
      name: "海外",
      sortOrder: 1,
    });
    const valueAsia = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "asia",
      name: "アジア",
      sortOrder: 1,
    });

    const schemeCurrency = await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: "currency",
      name: "通貨",
    });
    const valueYen = await createClassificationValue(db, {
      schemeId: schemeCurrency!.id,
      code: "yen",
      name: "円",
      sortOrder: 1,
    });

    const instrument = await createInstrument(db, { name: "テストファンド" });
    const instrumentUntagged = await createInstrument(db, { name: "無タグファンド" });
    await setInstrumentClassifications(db, instrument.id, [
      valueJapan.id,
      valueOverseas.id,
      valueAsia.id,
      valueYen.id,
    ]);

    const replaced = await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: instrument.id,
          sortOrder: 1,
          quantity: 100,
          marketValueMinor: 500000,
          bookValueMinor: 400000,
          metrics: [
            {
              code: "unit_price_per_10k_lots",
              integerValue: 12345,
            },
            {
              code: "unrealized_gain_rate",
              realValue: 0.05,
            },
          ],
        },
        {
          instrumentId: instrumentUntagged.id,
          quantity: 1,
          marketValueMinor: 1000,
        },
      ],
      metrics: [
        {
          code: "ideco_total_contributions",
          integerValue: 2_500_000,
        },
      ],
    });
    expect(replaced?.lines).toHaveLength(2);
    expect(replaced?.lines[0].sortOrder).toBe(1);
    expect(replaced?.lines[0].metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unit_price_per_10k_lots",
          integerValue: 12345,
        }),
        expect.objectContaining({
          code: "unrealized_gain_rate",
          realValue: 0.05,
        }),
      ]),
    );
    expect(replaced?.lines[0].tags[0].schemeCode).toBe("currency");
    expect(replaced?.lines[0].tags[1].valueName).toBe("日本");
    expect(replaced?.lines[0].instrumentAttributes).toEqual([]);
    expect(replaced?.lines[1].tags).toHaveLength(0);
    expect(replaced?.lines[1].instrumentAttributes).toEqual([]);
    expect(replaced?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ideco_total_contributions",
          integerValue: 2_500_000,
        }),
      ]),
    );

    const again = await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-02",
      lines: [],
    });
    expect(again?.lines).toHaveLength(0);
  });

  it("rejects duplicate instrument ids in snapshot lines", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const instrument = await createInstrument(db, { name: "テストファンド" });

    await expect(
      replaceCurrentSnapshot(db, {
        portfolioCode: "ideco",
        asOfDate: "2026-06-01",
        lines: [
          {
            instrumentId: instrument.id,
            quantity: 1,
            marketValueMinor: 1000,
          },
          {
            instrumentId: instrument.id,
            quantity: 2,
            marketValueMinor: 2000,
          },
        ],
      }),
    ).rejects.toThrow(SnapshotValidationError);
  });

  it("returns null when scheme portfolio is missing", async () => {
    const db = setup();
    const scheme = await createClassificationScheme(db, {
      portfolioCode: "missing",
      code: "x",
      name: "X",
    });
    expect(scheme).toBeNull();
  });

  it("returns empty tag map for no instruments", async () => {
    const db = setup();
    const tags = await getTagsForInstruments(db, []);
    expect(tags.size).toBe(0);
  });

  it("sorts snapshot lines by sortOrder then instrument name", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    const instrumentAlpha = await createInstrument(db, { name: "Alpha Fund" });
    const instrumentBeta = await createInstrument(db, { name: "Beta Fund" });
    const instrumentGamma = await createInstrument(db, { name: "Gamma Fund" });

    const replaced = await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: instrumentBeta.id,
          quantity: 1,
          marketValueMinor: 1000,
        },
        {
          instrumentId: instrumentAlpha.id,
          quantity: 1,
          marketValueMinor: 2000,
        },
        {
          instrumentId: instrumentGamma.id,
          sortOrder: 1,
          quantity: 1,
          marketValueMinor: 3000,
        },
      ],
    });

    expect(replaced?.lines.map((line) => line.instrumentName)).toEqual([
      "Gamma Fund",
      "Alpha Fund",
      "Beta Fund",
    ]);
  });

  it("lists, upserts, and fetches snapshots by date", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const instrument = await createInstrument(db, { name: "Alpha Fund" });

    await upsertSnapshotByDate(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-02",
      lines: [
        {
          instrumentId: instrument.id,
          quantity: 1,
          marketValueMinor: 1000,
        },
      ],
      setAsCurrent: false,
    });
    await upsertSnapshotByDate(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-07",
      lines: [
        {
          instrumentId: instrument.id,
          quantity: 1,
          marketValueMinor: 2000,
        },
      ],
      setAsCurrent: true,
    });

    const dates = await listSnapshotDates(db, "ideco");
    expect(dates).toEqual([
      { asOfDate: "2026-06-07", isCurrent: true },
      { asOfDate: "2026-06-02", isCurrent: false },
    ]);

    const older = await getSnapshotByDate(db, "ideco", "2026-06-02");
    expect(older?.lines[0].marketValueMinor).toBe(1000);

    await upsertSnapshotByDate(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-02",
      lines: [
        {
          instrumentId: instrument.id,
          quantity: 2,
          marketValueMinor: 1500,
        },
      ],
    });
    const updatedOlder = await getSnapshotByDate(db, "ideco", "2026-06-02");
    expect(updatedOlder?.lines[0].marketValueMinor).toBe(1500);

    await setCurrentSnapshot(db, "ideco", "2026-06-02");
    const current = await getCurrentSnapshot(db, "ideco");
    expect(current?.asOfDate).toBe("2026-06-02");
  });

  it("clears classifications when empty list is set", async () => {
    const db = setup();
    const instrument = await createInstrument(db, { name: "Empty tags" });
    await setInstrumentClassifications(db, instrument.id, []);
    const tags = await getTagsForInstruments(db, [instrument.id]);
    expect(tags.get(instrument.id)).toBeUndefined();
  });

  it("includes custom schemes for non-ideco portfolios", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "sample",
      name: "サンプル口座",
      kind: "taxable",
    });
    await createClassificationScheme(db, {
      portfolioCode: "sample",
      code: "x1",
      name: "軸1",
    });
    await createClassificationScheme(db, {
      portfolioCode: "sample",
      code: "metadata_only",
      name: "メタデータ",
    });

    const analysisSchemes = await listAnalysisSchemesForPortfolio(db, "sample");
    expect(analysisSchemes).toHaveLength(2);
    expect(analysisSchemes).toEqual(
      expect.arrayContaining([
        { schemeCode: "x1", schemeName: "軸1" },
        { schemeCode: "metadata_only", schemeName: "メタデータ" },
      ]),
    );
  });

  it("lists classification value ids for an instrument", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const scheme = await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: "region",
      name: "地域",
    });
    const valueJapan = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "japan",
      name: "日本",
    });
    const valueOverseas = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "overseas",
      name: "海外",
    });
    const instrument = await createInstrument(db, { name: "Tagged fund" });
    await setInstrumentClassifications(db, instrument.id, [
      valueJapan.id,
      valueOverseas.id,
    ]);

    const valueIds = await listInstrumentClassificationValueIds(db, instrument.id);
    expect(valueIds.sort()).toEqual([valueJapan.id, valueOverseas.id].sort());
  });

  it("manages classification scheme and value CRUD helpers", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const scheme = await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: "region",
      name: "地域",
    });
    expect(scheme).not.toBeNull();

    const foundScheme = await findSchemeById(db, scheme!.id);
    expect(foundScheme?.code).toBe("region");

    const value = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "japan",
      name: "日本",
      sortOrder: 0,
    });
    const foundValue = await findClassificationValueById(db, value.id);
    expect(foundValue?.name).toBe("日本");

    await updateClassificationValue(db, value.id, {
      name: "日本（更新）",
      sortOrder: 1,
    });
    const updatedValue = await findClassificationValueById(db, value.id);
    expect(updatedValue?.name).toBe("日本（更新）");

    await updateClassificationSchemeName(db, scheme!.id, "地域分類");
    const renamedScheme = await findSchemeById(db, scheme!.id);
    expect(renamedScheme?.name).toBe("地域分類");

    const schemesWithValues = await listSchemesWithValuesForPortfolio(db, "ideco");
    expect(schemesWithValues[0]?.values[0]?.code).toBe("japan");

    const missingDelete = await deleteClassificationValueById(db, "missing-value");
    expect(missingDelete).toBe(false);
    const deleted = await deleteClassificationValueById(db, value.id);
    expect(deleted).toBe(true);

    const replacement = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "overseas",
      name: "海外",
    });
    await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "remove-me",
      name: "削除対象",
    });
    await deleteClassificationValuesBySchemeIdNotInCodes(db, scheme!.id, ["overseas"]);
    expect(
      await findClassificationValueBySchemeAndCode(db, scheme!.id, "remove-me"),
    ).toBeNull();
    expect(
      await findClassificationValueBySchemeAndCode(db, scheme!.id, "overseas"),
    ).not.toBeNull();

    await deleteClassificationValuesBySchemeIdNotInCodes(db, scheme!.id, []);
    expect(
      await findClassificationValueBySchemeAndCode(db, scheme!.id, "overseas"),
    ).toBeNull();

    await deleteClassificationSchemeById(db, scheme!.id);
    expect(await findSchemeById(db, scheme!.id)).toBeNull();
    expect(replacement.id).toBeTruthy();
  });

  it("filters ideco analysis schemes and returns empty for missing portfolio", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: IDECO_SCHEME_CODES.region,
      name: "地域分類",
    });
    await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: IDECO_SCHEME_CODES.majorCategory,
      name: "大分類",
    });
    await createClassificationScheme(db, {
      portfolioCode: "ideco",
      code: "custom_axis",
      name: "カスタム",
    });

    const analysisSchemes = await listAnalysisSchemesForPortfolio(db, "ideco");
    expect(analysisSchemes.map((item) => item.schemeCode)).toEqual([
      IDECO_SCHEME_CODES.region,
    ]);

    const missingPortfolio = await listAnalysisSchemesForPortfolio(db, "missing");
    expect(missingPortfolio).toEqual([]);

    const schemes = await listClassificationSchemesByPortfolioCode(db, "missing");
    expect(schemes).toEqual([]);
  });

  it("supports instrument search, upsert, update, attributes, and delete guards", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    const created = await createInstrument(db, { name: "Alpha Fund" });
    const reused = await upsertInstrument(db, { name: "Alpha Fund" });
    expect(reused?.id).toBe(created.id);

    const beta = await createInstrument(db, { name: "Beta Fund" });
    await setInstrumentAttributes(db, beta.id, [
      { code: "short_name", textValue: "Beta" },
    ]);
    const byAttribute = await findInstrumentByAttributeTextValue(
      db,
      "short_name",
      "Beta",
    );
    expect(byAttribute?.id).toBe(beta.id);

    const all = await listInstruments(db);
    expect(all).toHaveLength(2);
    const searched = await listInstruments(db, "alpha");
    expect(searched).toHaveLength(1);

    const updated = await updateInstrument(db, created.id, {
      name: "Alpha Fund Updated",
    });
    expect(updated?.name).toBe("Alpha Fund Updated");
    expect(await updateInstrument(db, "missing", { name: "X" })).toBeNull();

    expect(await findInstrumentById(db, created.id)).not.toBeNull();
    expect(await findInstrumentByName(db, "missing")).toBeNull();
    expect(await getAttributesForInstruments(db, [])).toEqual(new Map());

    await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: created.id,
          quantity: 1,
          marketValueMinor: 1000,
        },
      ],
    });
    expect(await deleteInstrument(db, created.id)).toBe("in_use");

    const unused = await createInstrument(db, { name: "Gamma Fund" });
    expect(await deleteInstrument(db, unused.id)).toBe("deleted");
    expect(await deleteInstrument(db, "missing")).toBe("not_found");

    const withExternalId = await createInstrument(db, {
      name: "Delta Fund",
      externalId: "ext-1",
    });
    const updatedExternal = await updateInstrument(db, withExternalId.id, {
      name: "Delta Fund Updated",
      externalId: "ext-2",
    });
    expect(updatedExternal?.externalId).toBe("ext-2");
    const keptExternal = await updateInstrument(db, withExternalId.id, {
      name: "Delta Fund Final",
    });
    expect(keptExternal?.externalId).toBe("ext-2");

    await setInstrumentAttributes(db, beta.id, []);
    expect((await getAttributesForInstruments(db, [beta.id])).get(beta.id)).toBeUndefined();

    await setInstrumentAttributes(db, beta.id, [
      { code: "metric_code", integerValue: 42, realValue: 0.5 },
    ]);
    const metricAttributes = (await getAttributesForInstruments(db, [beta.id])).get(beta.id);
    expect(metricAttributes?.[0]).toMatchObject({
      code: "metric_code",
      integerValue: 42,
      realValue: 0.5,
      textValue: null,
    });
  });

  it("updates and deletes portfolios", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "sample",
      name: "サンプル",
      kind: "taxable",
    });

    const updated = await updatePortfolio(db, "sample", {
      name: "更新後",
      kind: "taxable",
    });
    expect(updated?.name).toBe("更新後");
    expect(await updatePortfolio(db, "missing", { name: "X", kind: "taxable" })).toBeNull();

    expect(await deletePortfolio(db, "sample")).toBe(true);
    expect(await deletePortfolio(db, "missing")).toBe(false);
    expect(await findPortfolioByCode(db, "sample")).toBeNull();
  });

  it("lists, replaces, and aggregates target allocation weights", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    expect(await listTargetAllocationWeights(db, "missing", "region")).toEqual([]);
    expect(await replaceTargetAllocationWeights(db, "missing", "region", [])).toBeNull();
    expect(await listAllTargetAllocationsForPortfolio(db, "missing")).toEqual({});

    expect(await listTargetAllocationWeights(db, "ideco", "region")).toEqual([]);

    const replaced = await replaceTargetAllocationWeights(db, "ideco", "region", [
      { valueCode: "japan", targetRatio: 0.6 },
      { valueCode: "global", targetRatio: 0.4 },
    ]);
    expect(replaced).toEqual([
      { valueCode: "japan", targetRatio: 0.6 },
      { valueCode: "global", targetRatio: 0.4 },
    ]);

    const listed = await listTargetAllocationWeights(db, "ideco", "region");
    expect(listed).toEqual(
      expect.arrayContaining([
        { valueCode: "japan", targetRatio: 0.6 },
        { valueCode: "global", targetRatio: 0.4 },
      ]),
    );
    expect(listed).toHaveLength(2);

    await replaceTargetAllocationWeights(db, "ideco", "asset", [
      { valueCode: "stock", targetRatio: 1 },
    ]);

    const all = await listAllTargetAllocationsForPortfolio(db, "ideco");
    expect(all.asset).toEqual([{ valueCode: "stock", targetRatio: 1 }]);
    expect(all.region).toEqual(
      expect.arrayContaining([
        { valueCode: "japan", targetRatio: 0.6 },
        { valueCode: "global", targetRatio: 0.4 },
      ]),
    );
    expect(all.region).toHaveLength(2);

    const cleared = await replaceTargetAllocationWeights(db, "ideco", "region", []);
    expect(cleared).toEqual([]);
    expect(await listTargetAllocationWeights(db, "ideco", "region")).toEqual([]);
  });

  it("lists and replaces target portfolio weights", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const instrument = await createInstrument(db, { name: "Alpha Fund" });

    expect(await listTargetPortfolioWeights(db, "missing")).toEqual([]);
    expect(await replaceTargetPortfolioWeights(db, "missing", [])).toBeNull();
    expect(await listTargetPortfolioWeights(db, "ideco")).toEqual([]);

    const replaced = await replaceTargetPortfolioWeights(db, "ideco", [
      { instrumentId: instrument.id, targetRatio: 0.6 },
    ]);
    expect(replaced).toEqual([{ instrumentId: instrument.id, targetRatio: 0.6 }]);
    expect(await listTargetPortfolioWeights(db, "ideco")).toEqual([
      { instrumentId: instrument.id, targetRatio: 0.6 },
    ]);

    const cleared = await replaceTargetPortfolioWeights(db, "ideco", []);
    expect(cleared).toEqual([]);
    expect(await listTargetPortfolioWeights(db, "ideco")).toEqual([]);
  });

  it("handles snapshot edge cases for unknown portfolios and date ranges", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const instrument = await createInstrument(db, { name: "Alpha Fund" });

    expect(await listSnapshotDates(db, "missing")).toEqual([]);
    expect(await getSnapshotByDate(db, "missing", "2026-06-01")).toBeNull();
    expect(await getSnapshotByDate(db, "ideco", "2026-06-01")).toBeNull();
    expect(await getSnapshotsInDateRange(db, "missing", "2026-06-01", "2026-06-07")).toEqual(
      [],
    );
    expect(await setCurrentSnapshot(db, "missing", "2026-06-01")).toBeNull();
    expect(
      await upsertSnapshotByDate(db, {
        portfolioCode: "missing",
        asOfDate: "2026-06-01",
        lines: [],
      }),
    ).toBeNull();

    await upsertSnapshotByDate(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-02",
      lines: [
        {
          instrumentId: instrument.id,
          quantity: 1,
          marketValueMinor: 1000,
        },
      ],
    });
    await upsertSnapshotByDate(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-07",
      lines: [
        {
          instrumentId: instrument.id,
          quantity: 1,
          marketValueMinor: 2000,
        },
      ],
    });

    const ranged = await getSnapshotsInDateRange(db, "ideco", "2026-06-02", "2026-06-07");
    expect(ranged).toHaveLength(2);
    expect(ranged[0]?.asOfDate).toBe("2026-06-02");

    await upsertSnapshotByDate(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-08",
      lines: [
        {
          instrumentId: instrument.id,
          quantity: 1,
          marketValueMinor: 3000,
        },
      ],
      metrics: [
        {
          code: "note",
          textValue: "snapshot note",
        },
      ],
      setAsCurrent: true,
    });
    const withTextMetric = await getSnapshotByDate(db, "ideco", "2026-06-08");
    expect(withTextMetric?.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "note",
          textValue: "snapshot note",
        }),
      ]),
    );
  });
});
