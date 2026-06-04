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
  const row = {
    id: newId(),
    name: params.name,
    instrumentType: params.instrumentType ?? "mutual_fund",
    currency: params.currency ?? "JPY",
    externalId: params.externalId ?? null,
    createdAt: nowIso(),
  };
  await db.insert(instruments).values(row);
  const result = row;
  return result;
}

export async function findInstrumentById(db: AppDatabase, id: string) {
  const rows = await db
    .select()
    .from(instruments)
    .where(eq(instruments.id, id))
    .limit(1);
  let result = rows[0] ?? null;
  return result;
}
