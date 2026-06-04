import { eq, inArray } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import {
  classificationSchemes,
  classificationValues,
  instrumentClassifications,
} from "../schema/index";
import { findPortfolioByCode } from "./portfolios";

export type CreateSchemeParams = {
  portfolioCode: string;
  code: string;
  name: string;
};

export type CreateValueParams = {
  schemeId: string;
  code: string;
  name: string;
  sortOrder?: number;
};

export async function createClassificationScheme(
  db: AppDatabase,
  params: CreateSchemeParams,
) {
  const portfolio = await findPortfolioByCode(db, params.portfolioCode);
  if (!portfolio) {
    let result: null = null;
    return result;
  }

  const row = {
    id: newId(),
    portfolioId: portfolio.id,
    code: params.code,
    name: params.name,
    createdAt: nowIso(),
  };
  await db.insert(classificationSchemes).values(row);
  const result = row;
  return result;
}

export async function findSchemeById(db: AppDatabase, schemeId: string) {
  const rows = await db
    .select()
    .from(classificationSchemes)
    .where(eq(classificationSchemes.id, schemeId))
    .limit(1);
  let result = rows[0] ?? null;
  return result;
}

export async function createClassificationValue(
  db: AppDatabase,
  params: CreateValueParams,
) {
  const row = {
    id: newId(),
    schemeId: params.schemeId,
    code: params.code,
    name: params.name,
    sortOrder: params.sortOrder ?? 0,
    createdAt: nowIso(),
  };
  await db.insert(classificationValues).values(row);
  const result = row;
  return result;
}

export async function setInstrumentClassifications(
  db: AppDatabase,
  instrumentId: string,
  classificationValueIds: string[],
) {
  await db
    .delete(instrumentClassifications)
    .where(eq(instrumentClassifications.instrumentId, instrumentId));

  if (classificationValueIds.length === 0) {
    return;
  }

  const rows = classificationValueIds.map((classificationValueId) => ({
    instrumentId,
    classificationValueId,
  }));
  await db.insert(instrumentClassifications).values(rows);
}

export async function getTagsForInstruments(
  db: AppDatabase,
  instrumentIds: string[],
) {
  if (instrumentIds.length === 0) {
    const result: Map<
      string,
      Array<{
        schemeCode: string;
        schemeName: string;
        valueCode: string;
        valueName: string;
        sortOrder: number;
      }>
    > = new Map();
    return result;
  }

  const rows = await db
    .select({
      instrumentId: instrumentClassifications.instrumentId,
      schemeCode: classificationSchemes.code,
      schemeName: classificationSchemes.name,
      valueCode: classificationValues.code,
      valueName: classificationValues.name,
      sortOrder: classificationValues.sortOrder,
    })
    .from(instrumentClassifications)
    .innerJoin(
      classificationValues,
      eq(
        instrumentClassifications.classificationValueId,
        classificationValues.id,
      ),
    )
    .innerJoin(
      classificationSchemes,
      eq(classificationValues.schemeId, classificationSchemes.id),
    )
    .where(inArray(instrumentClassifications.instrumentId, instrumentIds));

  type InstrumentTag = {
    schemeCode: string;
    schemeName: string;
    valueCode: string;
    valueName: string;
    sortOrder: number;
  };

  const result = new Map<string, InstrumentTag[]>();

  for (const row of rows) {
    const existing = result.get(row.instrumentId) ?? [];
    existing.push({
      schemeCode: row.schemeCode,
      schemeName: row.schemeName,
      valueCode: row.valueCode,
      valueName: row.valueName,
      sortOrder: row.sortOrder,
    });
    result.set(row.instrumentId, existing);
  }

  return result;
}
