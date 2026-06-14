import { eq } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import { targetPortfolioWeights } from "../schema/index";
import { findPortfolioByCode } from "./portfolios";

export type TargetPortfolioWeightRow = {
  instrumentId: string;
  targetRatio: number;
};

export async function listTargetPortfolioWeights(
  db: AppDatabase,
  portfolioCode: string,
): Promise<TargetPortfolioWeightRow[]> {
  let result: TargetPortfolioWeightRow[] = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select({
      instrumentId: targetPortfolioWeights.instrumentId,
      targetRatio: targetPortfolioWeights.targetRatio,
    })
    .from(targetPortfolioWeights)
    .where(eq(targetPortfolioWeights.portfolioId, portfolio.id));

  result = rows.map((row) => ({
    instrumentId: row.instrumentId,
    targetRatio: row.targetRatio,
  }));
  return result;
}

export async function replaceTargetPortfolioWeights(
  db: AppDatabase,
  portfolioCode: string,
  weights: TargetPortfolioWeightRow[],
): Promise<TargetPortfolioWeightRow[] | null> {
  let result: TargetPortfolioWeightRow[] | null = null;

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  await db
    .delete(targetPortfolioWeights)
    .where(eq(targetPortfolioWeights.portfolioId, portfolio.id));

  const updatedAt = nowIso();
  for (const weight of weights) {
    await db.insert(targetPortfolioWeights).values({
      id: newId(),
      portfolioId: portfolio.id,
      instrumentId: weight.instrumentId,
      targetRatio: weight.targetRatio,
      updatedAt,
    });
  }

  result = weights;
  return result;
}
