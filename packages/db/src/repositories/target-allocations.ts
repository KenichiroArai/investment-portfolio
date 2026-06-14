import { and, eq } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import { targetAllocationWeights } from "../schema/index";
import { findPortfolioByCode } from "./portfolios";

export type TargetAllocationWeightRow = {
  valueCode: string;
  targetRatio: number;
};

export async function listTargetAllocationWeights(
  db: AppDatabase,
  portfolioCode: string,
  schemeCode: string,
): Promise<TargetAllocationWeightRow[]> {
  let result: TargetAllocationWeightRow[] = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select({
      valueCode: targetAllocationWeights.valueCode,
      targetRatio: targetAllocationWeights.targetRatio,
    })
    .from(targetAllocationWeights)
    .where(
      and(
        eq(targetAllocationWeights.portfolioId, portfolio.id),
        eq(targetAllocationWeights.schemeCode, schemeCode),
      ),
    );

  result = rows.map((row) => ({
    valueCode: row.valueCode,
    targetRatio: row.targetRatio,
  }));
  return result;
}

export async function replaceTargetAllocationWeights(
  db: AppDatabase,
  portfolioCode: string,
  schemeCode: string,
  weights: TargetAllocationWeightRow[],
): Promise<TargetAllocationWeightRow[] | null> {
  let result: TargetAllocationWeightRow[] | null = null;

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  await db
    .delete(targetAllocationWeights)
    .where(
      and(
        eq(targetAllocationWeights.portfolioId, portfolio.id),
        eq(targetAllocationWeights.schemeCode, schemeCode),
      ),
    );

  const updatedAt = nowIso();
  for (const weight of weights) {
    await db.insert(targetAllocationWeights).values({
      id: newId(),
      portfolioId: portfolio.id,
      schemeCode,
      valueCode: weight.valueCode,
      targetRatio: weight.targetRatio,
      updatedAt,
    });
  }

  result = weights;
  return result;
}

export async function listAllTargetAllocationsForPortfolio(
  db: AppDatabase,
  portfolioCode: string,
): Promise<Record<string, TargetAllocationWeightRow[]>> {
  let result: Record<string, TargetAllocationWeightRow[]> = {};

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select({
      schemeCode: targetAllocationWeights.schemeCode,
      valueCode: targetAllocationWeights.valueCode,
      targetRatio: targetAllocationWeights.targetRatio,
    })
    .from(targetAllocationWeights)
    .where(eq(targetAllocationWeights.portfolioId, portfolio.id));

  for (const row of rows) {
    if (!result[row.schemeCode]) {
      result[row.schemeCode] = [];
    }
    result[row.schemeCode].push({
      valueCode: row.valueCode,
      targetRatio: row.targetRatio,
    });
  }

  return result;
}
