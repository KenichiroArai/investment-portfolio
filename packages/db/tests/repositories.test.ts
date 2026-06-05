import { afterEach, describe, expect, it } from "vitest";

import {
  createClassificationScheme,
  createClassificationValue,
  findSchemeByPortfolioCodeAndSchemeCode,
  getTagsForInstruments,
  setInstrumentClassifications,
} from "../src/repositories/classifications";
import { createInstrument } from "../src/repositories/instruments";
import {
  createPortfolio,
  listPortfolios,
} from "../src/repositories/portfolios";
import {
  getCurrentSnapshot,
  replaceCurrentSnapshot,
} from "../src/repositories/snapshots";
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
    expect(replaced?.lines[1].tags).toHaveLength(0);

    const again = await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-06-02",
      lines: [],
    });
    expect(again?.lines).toHaveLength(0);
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

  it("clears classifications when empty list is set", async () => {
    const db = setup();
    const instrument = await createInstrument(db, { name: "Empty tags" });
    await setInstrumentClassifications(db, instrument.id, []);
    const tags = await getTagsForInstruments(db, [instrument.id]);
    expect(tags.get(instrument.id)).toBeUndefined();
  });
});
