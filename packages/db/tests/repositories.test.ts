import { afterEach, describe, expect, it } from "vitest";

import { IDECO_SCHEME_CODES, MONEX_SCHEME_CODES, SnapshotValidationError } from "@repo/shared";

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
  setInstrumentClassificationsWithWeights,
  updateClassificationSchemeName,
  updateClassificationValue,
} from "../src/repositories/classifications";
import {
  createInstrument,
  deleteInstrument,
  findInstrumentByAttributeTextValue,
  findInstrumentById,
  findInstrumentByIdentity,
  findInstrumentByName,
  getAttributesForInstruments,
  listInstruments,
  listIdecoInstrumentsForPaste,
  listMonexInstrumentsForPaste,
  mergeInstruments,
  setInstrumentAttributes,
  updateInstrument,
  upsertInstrument,
} from "../src/repositories/instruments";
import { applyMonexAssetClassWeights } from "../src/apply-monex-asset-class-weights";
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

  it("finds scheme by portfolio code and scheme code", async () => {
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
    const found = await findSchemeByPortfolioCodeAndSchemeCode(db, "ideco", "region");
    expect(found?.id).toBe(scheme!.id);

    const missingScheme = await findSchemeByPortfolioCodeAndSchemeCode(db, "ideco", "missing");
    expect(missingScheme).toBeNull();
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
    await setInstrumentAttributes(db, instrument.id, [
      { code: "short_name", textValue: "テスト" },
    ]);
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
    expect(replaced?.lines[0].instrumentAttributes).toEqual([
      expect.objectContaining({
        code: "short_name",
        textValue: "テスト",
      }),
    ]);
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

  it("rejects duplicate instrument account pairs in snapshot lines", async () => {
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
            accountId: "ideco:unknown",
            accountName: "不明口座",
            quantity: 1,
            marketValueMinor: 1000,
          },
          {
            instrumentId: instrument.id,
            accountId: "ideco:unknown",
            accountName: "不明口座",
            quantity: 2,
            marketValueMinor: 2000,
          },
        ],
      }),
    ).rejects.toThrow(SnapshotValidationError);
  });

  it("allows the same instrument across different accounts in one snapshot", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "monex",
      name: "Monex",
      kind: "monex",
    });
    const instrument = await createInstrument(db, {
      portfolioCode: "monex",
      name: "同一ファンド",
    });

    const snapshot = await replaceCurrentSnapshot(db, {
      portfolioCode: "monex",
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: instrument.id,
          accountId: "monex:一般:普通預り",
          accountName: "一般 / 普通預り",
          quantity: 1,
          marketValueMinor: 1000,
        },
        {
          instrumentId: instrument.id,
          accountId: "monex:特定:普通預り",
          accountName: "特定 / 普通預り",
          quantity: 2,
          marketValueMinor: 2000,
        },
      ],
    });

    expect(snapshot?.lines).toHaveLength(2);
    expect(snapshot?.lines.every((line) => line.instrumentId === instrument.id)).toBe(true);
  });

  it("upsertInstrument matches identity across account ids", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "monex",
      name: "Monex",
      kind: "monex",
    });

    const first = await createInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:一般:普通預り",
      name: "同一ファンド",
    });
    const second = await upsertInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:特定:普通預り",
      name: "同一ファンド",
    });

    expect(second?.id).toBe(first?.id);
    expect(await listInstruments(db, { portfolioCode: "monex" })).toHaveLength(1);
  });

  it("mergeInstruments returns zero when no losers are provided", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const instrument = await createInstrument(db, { name: "Alpha Fund" });

    const merged = await mergeInstruments(db, instrument.id, []);
    expect(merged).toEqual({ canonicalId: instrument.id, mergedCount: 0 });
  });

  it("merges loser instruments into canonical and consolidates related data", async () => {
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
      sortOrder: 0,
    });

    const canonical = await createInstrument(db, { name: "Canonical Fund" });
    const loserOne = await createInstrument(db, { name: "Loser One" });
    const loserTwo = await createInstrument(db, { name: "Loser Two" });

    await replaceTargetPortfolioWeights(db, "ideco", [
      { instrumentId: canonical.id, targetRatio: 0.3 },
      { instrumentId: loserOne.id, targetRatio: 0.2 },
      { instrumentId: loserTwo.id, targetRatio: 0.1 },
    ]);
    await setInstrumentClassifications(db, canonical.id, [valueJapan.id]);
    await setInstrumentClassifications(db, loserOne.id, [valueJapan.id]);
    await setInstrumentAttributes(db, canonical.id, [
      { code: "market", textValue: "JP" },
    ]);
    await setInstrumentAttributes(db, loserOne.id, [
      { code: "market", textValue: "US" },
    ]);
    await setInstrumentAttributes(db, loserTwo.id, [
      { code: "ticker", textValue: "TEST" },
    ]);

    await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: canonical.id,
          quantity: 1,
          marketValueMinor: 1000,
        },
        {
          instrumentId: loserOne.id,
          quantity: 2,
          marketValueMinor: 2000,
        },
        {
          instrumentId: loserTwo.id,
          quantity: 3,
          marketValueMinor: 3000,
        },
      ],
    });

    const merged = await mergeInstruments(db, canonical.id, [loserOne.id, loserTwo.id]);
    expect(merged).toEqual({ canonicalId: canonical.id, mergedCount: 2 });
    expect(await mergeInstruments(db, "missing", [loserOne.id])).toBeNull();

    const snapshot = await getCurrentSnapshot(db, "ideco");
    expect(snapshot?.lines).toHaveLength(1);
    expect(snapshot?.lines[0]?.instrumentId).toBe(canonical.id);
    expect(snapshot?.lines[0]?.quantity).toBe(6);
    expect(snapshot?.lines[0]?.marketValueMinor).toBe(6000);

    const weights = await listTargetPortfolioWeights(db, "ideco");
    const canonicalWeight = weights.find((weight) => weight.instrumentId === canonical.id);
    expect(canonicalWeight?.targetRatio).toBeCloseTo(0.6);

    expect(await findInstrumentById(db, loserOne.id)).toBeNull();
    expect(await findInstrumentById(db, loserTwo.id)).toBeNull();

    const attributes = await getAttributesForInstruments(db, [canonical.id]);
    expect(attributes.get(canonical.id)?.map((item) => item.code).sort()).toEqual([
      "market",
      "ticker",
    ]);
  });

  it("moves holding lines when accounts differ and keeps null book values on merge", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    const canonical = await createInstrument(db, { name: "Canonical Fund" });
    const loserSameAccount = await createInstrument(db, { name: "Loser Same" });
    const loserOtherAccount = await createInstrument(db, { name: "Loser Other" });
    const loserPartialBook = await createInstrument(db, { name: "Loser Partial Book" });
    const loserNullBook = await createInstrument(db, { name: "Loser Null Book" });

    await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: canonical.id,
          accountId: "ideco:a",
          accountName: "A",
          quantity: 1,
          marketValueMinor: 1000,
          bookValueMinor: null,
        },
        {
          instrumentId: loserSameAccount.id,
          accountId: "ideco:a",
          accountName: "A",
          quantity: 2,
          marketValueMinor: 2000,
          bookValueMinor: null,
        },
        {
          instrumentId: loserOtherAccount.id,
          accountId: "ideco:b",
          accountName: "B",
          quantity: 3,
          marketValueMinor: 3000,
          bookValueMinor: 100,
        },
        {
          instrumentId: loserPartialBook.id,
          accountId: "ideco:a",
          accountName: "A",
          quantity: 1,
          marketValueMinor: 500,
          bookValueMinor: 50,
        },
      ],
    });

    const merged = await mergeInstruments(db, canonical.id, [
      loserSameAccount.id,
      loserOtherAccount.id,
      loserPartialBook.id,
    ]);
    expect(merged).toEqual({ canonicalId: canonical.id, mergedCount: 3 });

    const snapshot = await getCurrentSnapshot(db, "ideco");
    expect(snapshot?.lines).toHaveLength(2);
    const accountA = snapshot?.lines.find((line) => line.accountId === "ideco:a");
    const accountB = snapshot?.lines.find((line) => line.accountId === "ideco:b");
    expect(accountA?.quantity).toBe(4);
    expect(accountA?.bookValueMinor).toBe(50);
    expect(accountB?.instrumentId).toBe(canonical.id);
    expect(accountB?.quantity).toBe(3);

    await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-02",
      lines: [
        {
          instrumentId: canonical.id,
          accountId: "ideco:a",
          accountName: "A",
          quantity: 1,
          marketValueMinor: 1000,
          bookValueMinor: 80,
        },
        {
          instrumentId: loserNullBook.id,
          accountId: "ideco:a",
          accountName: "A",
          quantity: 1,
          marketValueMinor: 200,
          bookValueMinor: null,
        },
      ],
    });

    await mergeInstruments(db, canonical.id, [loserNullBook.id]);
    const afterNullLoser = await getCurrentSnapshot(db, "ideco");
    expect(afterNullLoser?.lines[0]?.bookValueMinor).toBe(80);
  });

  it("moves target portfolio weights when canonical has no existing weight", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    const canonical = await createInstrument(db, { name: "Canonical Fund" });
    const loser = await createInstrument(db, { name: "Loser Fund" });
    await replaceTargetPortfolioWeights(db, "ideco", [
      { instrumentId: loser.id, targetRatio: 0.15 },
    ]);

    await mergeInstruments(db, canonical.id, [loser.id]);

    const weights = await listTargetPortfolioWeights(db, "ideco");
    expect(weights).toHaveLength(1);
    expect(weights[0]?.instrumentId).toBe(canonical.id);
    expect(weights[0]?.targetRatio).toBeCloseTo(0.15);
  });

  it("findInstrumentByIdentity matches external id null and empty equally", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const created = await createInstrument(db, {
      portfolioCode: "ideco",
      name: "Null External",
      externalId: null,
    });

    const found = await findInstrumentByIdentity(db, {
      portfolioCode: "ideco",
      name: "Null External",
      externalId: "",
    });
    expect(found?.id).toBe(created.id);
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
    const instrumentDelta = await createInstrument(db, { name: "Delta Fund" });

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
          instrumentId: instrumentDelta.id,
          quantity: 1,
          marketValueMinor: 4000,
        },
        {
          instrumentId: instrumentAlpha.id,
          sortOrder: 2,
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
      "Delta Fund",
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
      setAsCurrent: true,
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

  it("filters monex analysis schemes", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "monex",
      name: "Monex",
      kind: "monex",
    });
    await createClassificationScheme(db, {
      portfolioCode: "monex",
      code: MONEX_SCHEME_CODES.assetClass,
      name: "資産クラス",
    });
    await createClassificationScheme(db, {
      portfolioCode: "monex",
      code: "custom_axis",
      name: "カスタム",
    });

    const analysisSchemes = await listAnalysisSchemesForPortfolio(db, "monex");
    expect(analysisSchemes.map((item) => item.schemeCode)).toEqual([
      MONEX_SCHEME_CODES.assetClass,
    ]);
  });

  it("ignores invalid classification weights", async () => {
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
      sortOrder: 0,
    });
    const instrument = await createInstrument(db, { name: "Alpha Fund" });

    await setInstrumentClassificationsWithWeights(db, instrument.id, [
      { classificationValueId: valueJapan.id, allocationWeight: -1 },
      { classificationValueId: valueJapan.id, allocationWeight: Number.NaN },
    ]);
    expect(await listInstrumentClassificationValueIds(db, instrument.id)).toEqual([]);

    await setInstrumentClassificationsWithWeights(db, instrument.id, [
      { classificationValueId: valueJapan.id, allocationWeight: 2 },
      { classificationValueId: valueJapan.id, allocationWeight: 0 },
    ]);
    expect(await listInstrumentClassificationValueIds(db, instrument.id)).toEqual([
      valueJapan.id,
    ]);

    await setInstrumentClassificationsWithWeights(db, instrument.id, [
      { classificationValueId: valueJapan.id, allocationWeight: 0 },
    ]);
    expect(await listInstrumentClassificationValueIds(db, instrument.id)).toEqual([]);
  });

  it("lists instruments with portfolio, account, and search filters", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "monex",
      name: "Monex",
      kind: "monex",
    });
    await createInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:一般:普通預り",
      name: "Alpha Fund",
    });
    await createInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:NISA:普通預り",
      name: "Beta Fund",
    });

    expect(await listInstruments(db, { portfolioCode: "missing" })).toEqual([]);
    expect(
      await listInstruments(db, {
        portfolioCode: "monex",
        accountId: "monex:一般:普通預り",
      }),
    ).toHaveLength(1);
    expect(
      await listInstruments(db, {
        portfolioCode: "monex",
        searchQuery: "alpha",
      }),
    ).toHaveLength(1);
    expect(
      await findInstrumentByName(db, {
        portfolioCode: "monex",
        accountId: "monex:一般:普通預り",
        name: "Alpha Fund",
      }),
    ).not.toBeNull();
    expect(
      await findInstrumentByName(db, {
        portfolioCode: "missing",
        accountId: "monex:一般:普通預り",
        name: "Alpha Fund",
      }),
    ).toBeNull();
    expect(
      await findInstrumentByIdentity(db, {
        portfolioCode: "missing",
        name: "Alpha Fund",
      }),
    ).toBeNull();
  });

  it("lists paste instruments from all instruments when ideco portfolio is missing", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "sample",
      name: "Sample",
      kind: "taxable",
    });
    const instrument = await createInstrument(db, {
      portfolioCode: "sample",
      name: "Sample Fund",
    });

    const rows = await listIdecoInstrumentsForPaste(db);
    expect(rows.some((row) => row.id === instrument.id)).toBe(true);
  });

  it("creates portfolio automatically for unknown portfolio code on createInstrument", async () => {
    const db = setup();
    const created = await createInstrument(db, {
      portfolioCode: "newpf",
      name: "New Portfolio Fund",
    });
    expect(created).not.toBeNull();
    expect(await findPortfolioByCode(db, "newpf")).not.toBeNull();
  });

  it("uses the first portfolio when ideco is absent", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "sample",
      name: "Sample",
      kind: "taxable",
    });
    const created = await createInstrument(db, { name: "Sample Fund" });
    expect(created?.portfolioId).toBe(
      (await findPortfolioByCode(db, "sample"))?.id,
    );

    const upserted = await upsertInstrument(db, { name: "Upsert Sample Fund" });
    expect(upserted?.portfolioId).toBe((await findPortfolioByCode(db, "sample"))?.id);
  });

  it("defaults portfolio code to legacy when no portfolios exist", async () => {
    const db = setup();
    const created = await upsertInstrument(db, { name: "Legacy Fund" });
    expect(created?.portfolioId).toBeTruthy();
    expect(await findPortfolioByCode(db, "legacy")).not.toBeNull();
  });

  it("lists ideco paste instruments with and without short name attributes", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const withShortName = await createInstrument(db, { name: "Alpha Fund" });
    await createInstrument(db, { name: "Beta Fund" });
    await setInstrumentAttributes(db, withShortName.id, [
      { code: "short_name", textValue: "Alpha" },
    ]);

    const rows = await listIdecoInstrumentsForPaste(db);

    expect(rows).toEqual([
      { id: withShortName.id, name: "Alpha Fund", shortName: "Alpha" },
      expect.objectContaining({ name: "Beta Fund", shortName: null }),
    ]);
  });

  it("lists monex paste instruments and applies weighted asset class tags", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "monex",
      name: "マネックス証券",
      kind: "monex",
    });
    const instrument = await createInstrument(db, {
      portfolioCode: "monex",
      accountId: "monex:特定:普通預り",
      name: "テストファンド",
    });
    await setInstrumentAttributes(db, instrument.id, [
      { code: "ticker", textValue: "TEST" },
    ]);

    const rows = await listMonexInstrumentsForPaste(db);
    expect(rows).toEqual([
      { id: instrument.id, name: "テストファンド", ticker: "TEST" },
    ]);

    const applied = await applyMonexAssetClassWeights(db, [
      {
        instrumentId: instrument.id,
        weights: [
          { valueCode: "emerging_equity", allocationWeight: 0.6 },
          { valueCode: "other", allocationWeight: 0.4 },
        ],
      },
    ]);
    expect(applied.updatedInstrumentCount).toBe(1);

    const tags = await getTagsForInstruments(db, [instrument.id]);
    const instrumentTags = tags.get(instrument.id) ?? [];
    expect(instrumentTags).toHaveLength(2);
    expect(instrumentTags.map((tag) => tag.valueCode).sort()).toEqual([
      "emerging_equity",
      "other",
    ]);
  });

  it("returns empty monex paste instruments when monex portfolio is missing", async () => {
    const db = setup();
    expect(await listMonexInstrumentsForPaste(db)).toEqual([]);
  });

  it("throws when applying monex asset class weights without monex portfolio", async () => {
    const db = setup();
    await expect(applyMonexAssetClassWeights(db, [])).rejects.toThrow(
      "マネックス証券ポートフォリオが見つかりません",
    );
  });

  it("skips invalid monex weight assignments and reuses existing scheme on repeated runs", async () => {
    const db = setup();
    await createPortfolio(db, {
      code: "monex",
      name: "マネックス証券",
      kind: "monex",
    });
    await createPortfolio(db, {
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    const monexInstrument = await createInstrument(db, {
      portfolioCode: "monex",
      name: "Monex Fund",
    });
    const idecoInstrument = await createInstrument(db, {
      portfolioCode: "ideco",
      name: "iDeCo Fund",
    });

    const first = await applyMonexAssetClassWeights(db, [
      {
        instrumentId: "missing",
        weights: [{ valueCode: "other", allocationWeight: 1 }],
      },
      {
        instrumentId: idecoInstrument.id,
        weights: [{ valueCode: "other", allocationWeight: 1 }],
      },
      {
        instrumentId: monexInstrument.id,
        weights: [
          { valueCode: "unknown_code", allocationWeight: 1 },
          { valueCode: "other", allocationWeight: Number.NaN },
          { valueCode: "other", allocationWeight: 0 },
        ],
      },
    ]);
    expect(first.updatedInstrumentCount).toBe(0);
    expect(await listInstrumentClassificationValueIds(db, monexInstrument.id)).toEqual([]);

    const second = await applyMonexAssetClassWeights(db, [
      {
        instrumentId: monexInstrument.id,
        weights: [{ valueCode: "other", allocationWeight: 1 }],
      },
    ]);
    expect(second.updatedInstrumentCount).toBe(1);

    const tags = await getTagsForInstruments(db, [monexInstrument.id]);
    expect((tags.get(monexInstrument.id) ?? []).map((tag) => tag.valueCode)).toEqual([
      "other",
    ]);
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

    const createdViaUpsert = await upsertInstrument(db, { name: "Upsert New Fund" });
    expect(createdViaUpsert?.name).toBe("Upsert New Fund");

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
    expect(
      await findInstrumentByAttributeTextValue(db, "short_name", "missing"),
    ).toBeNull();

    const all = await listInstruments(db);
    expect(all).toHaveLength(3);
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
