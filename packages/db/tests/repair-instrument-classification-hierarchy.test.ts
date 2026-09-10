import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import {
  addClassificationLink,
  createClassificationScheme,
  createClassificationValue,
  getTagsForInstruments,
  setInstrumentClassificationsWithWeights,
  type InstrumentClassificationWeightInput,
} from "../src/repositories/classifications";
import { createInstrument } from "../src/repositories/instruments";
import { createPortfolio } from "../src/repositories/portfolios";
import { repairInstrumentClassificationHierarchy } from "../src/repair-instrument-classification-hierarchy";
import { instrumentClassifications } from "../src/schema/index";
import { createTestDb } from "../src/test-utils";

describe("repairInstrumentClassificationHierarchy", () => {
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

  async function seedAssetClassScheme(db: ReturnType<typeof setup>) {
    await createPortfolio(db, { code: "monex", name: "Monex", kind: "monex" });
    const scheme = await createClassificationScheme(db, {
      portfolioCode: "monex",
      code: "monex_asset_class",
      name: "資産クラス",
    });
    const domesticEquity = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "domestic_equity",
      name: "国内株式",
      sortOrder: 0,
    });
    const income = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "income",
      name: "インカム",
      sortOrder: 1,
    });
    const growth = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "growth",
      name: "成長",
      sortOrder: 2,
    });
    const developedEquity = await createClassificationValue(db, {
      schemeId: scheme!.id,
      code: "developed_equity",
      name: "先進国株式",
      sortOrder: 3,
    });
    await addClassificationLink(db, {
      parentValueId: domesticEquity.id,
      childValueId: income.id,
    });
    await addClassificationLink(db, {
      parentValueId: domesticEquity.id,
      childValueId: growth.id,
    });

    let result = { domesticEquity, income, growth, developedEquity };
    return result;
  }

  /** 階層正規化を迂回し、親+子併存の壊れたデータを用意する */
  async function insertRawInstrumentClassifications(
    db: ReturnType<typeof setup>,
    instrumentId: string,
    weights: InstrumentClassificationWeightInput[],
  ) {
    let result: void = undefined;
    await db
      .delete(instrumentClassifications)
      .where(eq(instrumentClassifications.instrumentId, instrumentId));
    if (weights.length === 0) {
      return result;
    }
    await db.insert(instrumentClassifications).values(
      weights.map((weight) => ({
        instrumentId,
        classificationValueId: weight.classificationValueId,
        allocationWeight: weight.allocationWeight,
      })),
    );
    return result;
  }

  it("moves the parent tag weight onto the child tag", async () => {
    const db = setup();
    const values = await seedAssetClassScheme(db);
    const fund = await createInstrument(db, {
      portfolioCode: "monex",
      name: "ＳＢＩ日本高配当株式（分配）ファンド",
    });

    await insertRawInstrumentClassifications(db, fund.id, [
      { classificationValueId: values.domesticEquity.id, allocationWeight: 0.5 },
      { classificationValueId: values.income.id, allocationWeight: 0.5 },
    ]);

    const repaired = await repairInstrumentClassificationHierarchy(db);
    expect(repaired).toEqual({ repairedInstrumentCount: 1, movedTagCount: 1 });

    const tags = (await getTagsForInstruments(db, [fund.id])).get(fund.id) ?? [];
    expect(tags.map((tag) => tag.valueCode)).toEqual(["income"]);
    expect(tags[0]?.allocationWeight).toBe(1);
  });

  it("restores an even split for balanced funds", async () => {
    const db = setup();
    const values = await seedAssetClassScheme(db);
    const fund = await createInstrument(db, {
      portfolioCode: "monex",
      name: "ｅＭＡＸＩＳ Ｓｌｉｍ バランス",
    });

    await insertRawInstrumentClassifications(db, fund.id, [
      { classificationValueId: values.domesticEquity.id, allocationWeight: 1 / 3 },
      { classificationValueId: values.growth.id, allocationWeight: 1 / 3 },
      { classificationValueId: values.developedEquity.id, allocationWeight: 1 / 3 },
    ]);

    await repairInstrumentClassificationHierarchy(db);

    const tags = (await getTagsForInstruments(db, [fund.id])).get(fund.id) ?? [];
    expect(tags.map((tag) => tag.valueCode).sort()).toEqual([
      "developed_equity",
      "growth",
    ]);
    for (const tag of tags) {
      expect(tag.allocationWeight).toBeCloseTo(0.5);
    }
  });

  it("treats a missing allocation weight as one", async () => {
    const db = setup();
    const values = await seedAssetClassScheme(db);
    const fund = await createInstrument(db, {
      portfolioCode: "monex",
      name: "重み未設定ファンド",
    });

    await insertRawInstrumentClassifications(db, fund.id, [
      { classificationValueId: values.domesticEquity.id, allocationWeight: 1 },
      { classificationValueId: values.growth.id, allocationWeight: 1 },
    ]);
    await db
      .update(instrumentClassifications)
      .set({ allocationWeight: null })
      .where(eq(instrumentClassifications.instrumentId, fund.id));

    await repairInstrumentClassificationHierarchy(db);

    const tags = (await getTagsForInstruments(db, [fund.id])).get(fund.id) ?? [];
    expect(tags.map((tag) => tag.valueCode)).toEqual(["growth"]);
    expect(tags[0]?.allocationWeight).toBe(1);
  });

  it("is idempotent and leaves healthy tags untouched", async () => {
    const db = setup();
    const values = await seedAssetClassScheme(db);
    const fund = await createInstrument(db, {
      portfolioCode: "monex",
      name: "健全ファンド",
    });

    await setInstrumentClassificationsWithWeights(db, fund.id, [
      { classificationValueId: values.income.id, allocationWeight: 0.4 },
      { classificationValueId: values.developedEquity.id, allocationWeight: 0.6 },
    ]);

    expect(await repairInstrumentClassificationHierarchy(db)).toEqual({
      repairedInstrumentCount: 0,
      movedTagCount: 0,
    });

    await insertRawInstrumentClassifications(db, fund.id, [
      { classificationValueId: values.domesticEquity.id, allocationWeight: 0.5 },
      { classificationValueId: values.income.id, allocationWeight: 0.5 },
    ]);
    await repairInstrumentClassificationHierarchy(db);

    expect(await repairInstrumentClassificationHierarchy(db)).toEqual({
      repairedInstrumentCount: 0,
      movedTagCount: 0,
    });
  });

  it("normalizes parent+child on setInstrumentClassificationsWithWeights", async () => {
    const db = setup();
    const values = await seedAssetClassScheme(db);
    const fund = await createInstrument(db, {
      portfolioCode: "monex",
      name: "保存時正規化ファンド",
    });

    await setInstrumentClassificationsWithWeights(db, fund.id, [
      { classificationValueId: values.domesticEquity.id, allocationWeight: 0.5 },
      { classificationValueId: values.income.id, allocationWeight: 0.5 },
    ]);

    const tags = (await getTagsForInstruments(db, [fund.id])).get(fund.id) ?? [];
    expect(tags.map((tag) => tag.valueCode)).toEqual(["income"]);
    expect(tags[0]?.allocationWeight).toBe(1);

    expect(await repairInstrumentClassificationHierarchy(db)).toEqual({
      repairedInstrumentCount: 0,
      movedTagCount: 0,
    });
  });
});
