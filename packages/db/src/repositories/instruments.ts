import { and, eq, inArray } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import { instrumentAttributes, instruments } from "../schema/index";

export type CreateInstrumentParams = {
  name: string;
  instrumentType?: string;
  currency?: string;
  externalId?: string | null;
};

export type InstrumentAttributeInput = {
  code: string;
  integerValue?: number | null;
  realValue?: number | null;
  textValue?: string | null;
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

export async function upsertInstrument(
  db: AppDatabase,
  params: CreateInstrumentParams,
) {
  let result: Awaited<ReturnType<typeof createInstrument>> | null = null;

  const existing = await findInstrumentByName(db, params.name);
  if (existing) {
    result = existing;
    return result;
  }

  result = await createInstrument(db, params);
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

export async function findInstrumentByAttributeTextValue(
  db: AppDatabase,
  attributeCode: string,
  textValue: string,
) {
  let result: (typeof instruments.$inferSelect) | null = null;

  const rows = await db
    .select({
      id: instruments.id,
      name: instruments.name,
      instrumentType: instruments.instrumentType,
      currency: instruments.currency,
      externalId: instruments.externalId,
      createdAt: instruments.createdAt,
    })
    .from(instruments)
    .innerJoin(
      instrumentAttributes,
      eq(instrumentAttributes.instrumentId, instruments.id),
    )
    .where(
      and(
        eq(instrumentAttributes.code, attributeCode),
        eq(instrumentAttributes.textValue, textValue),
      ),
    )
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function setInstrumentAttributes(
  db: AppDatabase,
  instrumentId: string,
  attributes: InstrumentAttributeInput[],
) {
  let result: void = undefined;

  await db
    .delete(instrumentAttributes)
    .where(eq(instrumentAttributes.instrumentId, instrumentId));

  if (attributes.length === 0) {
    return result;
  }

  const rows = attributes.map((attribute) => {
    let result = {
      id: newId(),
      instrumentId,
      code: attribute.code,
      integerValue: attribute.integerValue ?? null,
      realValue: attribute.realValue ?? null,
      textValue: attribute.textValue ?? null,
    };
    return result;
  });
  await db.insert(instrumentAttributes).values(rows);

  return result;
}

type InstrumentAttributeRow = {
  instrumentId: string;
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

export async function getAttributesForInstruments(
  db: AppDatabase,
  instrumentIds: string[],
) {
  let result = new Map<string, InstrumentAttributeRow[]>();

  if (instrumentIds.length === 0) {
    return result;
  }

  const uniqueIds = [...new Set(instrumentIds)];
  const rows = await db
    .select({
      instrumentId: instrumentAttributes.instrumentId,
      code: instrumentAttributes.code,
      integerValue: instrumentAttributes.integerValue,
      realValue: instrumentAttributes.realValue,
      textValue: instrumentAttributes.textValue,
    })
    .from(instrumentAttributes)
    .where(inArray(instrumentAttributes.instrumentId, uniqueIds));

  for (const row of rows) {
    const existing = result.get(row.instrumentId) ?? [];
    existing.push(row);
    result.set(row.instrumentId, existing);
  }

  return result;
}
