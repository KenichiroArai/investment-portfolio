import { resolveHierarchyTagWeights } from "@repo/shared";
import { eq } from "drizzle-orm";

import type { AppDatabase } from "./client";
import {
  buildPortfolioClassificationGraph,
  setInstrumentClassificationsWithWeights,
  type InstrumentClassificationWeightInput,
} from "./repositories/classifications";
import { listPortfolios } from "./repositories/portfolios";
import { instrumentClassifications, instruments } from "./schema/index";

export type RepairInstrumentClassificationHierarchyResult = {
  repairedInstrumentCount: number;
  movedTagCount: number;
};

async function listInstrumentTagWeightsForPortfolio(
  db: AppDatabase,
  portfolioId: string,
): Promise<Map<string, InstrumentClassificationWeightInput[]>> {
  let result = new Map<string, InstrumentClassificationWeightInput[]>();

  const rows = await db
    .select({
      instrumentId: instrumentClassifications.instrumentId,
      classificationValueId: instrumentClassifications.classificationValueId,
      allocationWeight: instrumentClassifications.allocationWeight,
    })
    .from(instrumentClassifications)
    .innerJoin(
      instruments,
      eq(instrumentClassifications.instrumentId, instruments.id),
    )
    .where(eq(instruments.portfolioId, portfolioId));

  for (const row of rows) {
    const existing = result.get(row.instrumentId) ?? [];
    existing.push({
      classificationValueId: row.classificationValueId,
      allocationWeight: row.allocationWeight ?? 1,
    });
    result.set(row.instrumentId, existing);
  }

  return result;
}

/**
 * 親タグと子タグが並列に付いている銘柄を修復する。
 * 親直付けの重みを最近接の子タグへ移すことで、ドリルダウン時の見せかけの残差をなくす。
 */
export async function repairInstrumentClassificationHierarchy(
  db: AppDatabase,
): Promise<RepairInstrumentClassificationHierarchyResult> {
  let result: RepairInstrumentClassificationHierarchyResult = {
    repairedInstrumentCount: 0,
    movedTagCount: 0,
  };

  const portfolioRows = await listPortfolios(db);

  for (const portfolio of portfolioRows) {
    const graph = await buildPortfolioClassificationGraph(db, portfolio.id);
    const weightsByInstrument = await listInstrumentTagWeightsForPortfolio(
      db,
      portfolio.id,
    );

    for (const [instrumentId, weights] of weightsByInstrument) {
      const resolved = resolveHierarchyTagWeights(
        weights.map((weight) => {
          let tagWeight = {
            valueId: weight.classificationValueId,
            weight: weight.allocationWeight,
          };
          return tagWeight;
        }),
        graph,
      );

      // 祖先タグが取り除かれたときだけ重みが変わるため、件数一致なら修復不要
      if (resolved.length === weights.length) {
        continue;
      }

      await setInstrumentClassificationsWithWeights(
        db,
        instrumentId,
        resolved.map((weight) => {
          let weightInput: InstrumentClassificationWeightInput = {
            classificationValueId: weight.valueId,
            allocationWeight: weight.weight,
          };
          return weightInput;
        }),
      );
      result.repairedInstrumentCount += 1;
      result.movedTagCount += weights.length - resolved.length;
    }
  }

  return result;
}
