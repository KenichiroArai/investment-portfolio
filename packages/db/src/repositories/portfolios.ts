import { eq } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import { portfolios } from "../schema/index";

export type CreatePortfolioParams = {
  code: string;
  name: string;
  kind: string;
};

export async function listPortfolios(db: AppDatabase) {
  const result = await db.select().from(portfolios).orderBy(portfolios.code);
  return result;
}

export async function findPortfolioByCode(db: AppDatabase, code: string) {
  const rows = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.code, code))
    .limit(1);
  let result = rows[0] ?? null;
  return result;
}

export async function createPortfolio(
  db: AppDatabase,
  params: CreatePortfolioParams,
) {
  const row = {
    id: newId(),
    code: params.code,
    name: params.name,
    kind: params.kind,
    createdAt: nowIso(),
  };
  await db.insert(portfolios).values(row);
  const result = row;
  return result;
}
