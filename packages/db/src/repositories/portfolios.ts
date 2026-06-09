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
  let result = await db.select().from(portfolios).orderBy(portfolios.code);
  return result;
}

export async function findPortfolioByCode(db: AppDatabase, code: string) {
  let result: (typeof portfolios.$inferSelect) | null = null;

  const rows = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.code, code))
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function createPortfolio(
  db: AppDatabase,
  params: CreatePortfolioParams,
) {
  let result = {
    id: newId(),
    code: params.code,
    name: params.name,
    kind: params.kind,
    createdAt: nowIso(),
  };

  await db.insert(portfolios).values(result);
  return result;
}

export type UpdatePortfolioParams = {
  name: string;
  kind: string;
};

export async function updatePortfolio(
  db: AppDatabase,
  code: string,
  params: UpdatePortfolioParams,
) {
  let result: (typeof portfolios.$inferSelect) | null = null;

  const existing = await findPortfolioByCode(db, code);
  if (!existing) {
    return result;
  }

  await db
    .update(portfolios)
    .set({
      name: params.name,
      kind: params.kind,
    })
    .where(eq(portfolios.code, code));

  result = {
    ...existing,
    name: params.name,
    kind: params.kind,
  };
  return result;
}

export async function deletePortfolio(db: AppDatabase, code: string) {
  let result = false;

  const existing = await findPortfolioByCode(db, code);
  if (!existing) {
    return result;
  }

  await db.delete(portfolios).where(eq(portfolios.code, code));
  result = true;
  return result;
}
