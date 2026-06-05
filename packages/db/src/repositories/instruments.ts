import { eq } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import { instruments } from "../schema/index";

export type CreateInstrumentParams = {
  name: string;
  instrumentType?: string;
  currency?: string;
  externalId?: string | null;
};

export async function createInstrument(
  db: AppDatabase,
  params: CreateInstrumentParams,
) {
  let result = {
    id: newId(),
    name: params.name,
    instrumentType: params.instrumentType ?? "mutual_fund",
    currency: params.currency ?? "JPY",
    externalId: params.externalId ?? null,
    createdAt: nowIso(),
  };

  await db.insert(instruments).values(result);
  return result;
}

export async function findInstrumentById(db: AppDatabase, id: string) {
  let result: (typeof instruments.$inferSelect) | null = null;

  const rows = await db
    .select()
    .from(instruments)
    .where(eq(instruments.id, id))
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function findInstrumentByName(db: AppDatabase, name: string) {
  let result: (typeof instruments.$inferSelect) | null = null;

  const rows = await db
    .select()
    .from(instruments)
    .where(eq(instruments.name, name))
    .limit(1);
  result = rows[0] ?? null;
  return result;
}
