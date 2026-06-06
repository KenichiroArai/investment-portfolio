import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { isIdecoAnalysisSchemeCode } from "@repo/shared";

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
  let result: (typeof classificationSchemes.$inferSelect) | null = null;

  const portfolio = await findPortfolioByCode(db, params.portfolioCode);
  if (!portfolio) {
    return result;
  }

  result = {
    id: newId(),
    portfolioId: portfolio.id,
    code: params.code,
    name: params.name,
    createdAt: nowIso(),
  };
  await db.insert(classificationSchemes).values(result);
  return result;
}

export async function findSchemeById(db: AppDatabase, schemeId: string) {
  let result: (typeof classificationSchemes.$inferSelect) | null = null;

  const rows = await db
    .select()
    .from(classificationSchemes)
    .where(eq(classificationSchemes.id, schemeId))
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function findSchemeByPortfolioCodeAndSchemeCode(
  db: AppDatabase,
  portfolioCode: string,
  schemeCode: string,
) {
  let result: (typeof classificationSchemes.$inferSelect) | null = null;

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select()
    .from(classificationSchemes)
    .where(
      and(
        eq(classificationSchemes.portfolioId, portfolio.id),
        eq(classificationSchemes.code, schemeCode),
      ),
    )
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function findClassificationValueBySchemeAndCode(
  db: AppDatabase,
  schemeId: string,
  code: string,
) {
  let result: (typeof classificationValues.$inferSelect) | null = null;

  const rows = await db
    .select()
    .from(classificationValues)
    .where(
      and(
        eq(classificationValues.schemeId, schemeId),
        eq(classificationValues.code, code),
      ),
    )
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function createClassificationValue(
  db: AppDatabase,
  params: CreateValueParams,
) {
  let result = {
    id: newId(),
    schemeId: params.schemeId,
    code: params.code,
    name: params.name,
    sortOrder: params.sortOrder ?? 0,
    createdAt: nowIso(),
  };

  await db.insert(classificationValues).values(result);
  return result;
}

export async function listClassificationValuesBySchemeId(
  db: AppDatabase,
  schemeId: string,
) {
  let result: (typeof classificationValues.$inferSelect)[] = [];

  result = await db
    .select()
    .from(classificationValues)
    .where(eq(classificationValues.schemeId, schemeId));
  return result;
}

export async function updateClassificationValue(
  db: AppDatabase,
  valueId: string,
  params: { name: string; sortOrder: number },
) {
  let result: void = undefined;

  await db
    .update(classificationValues)
    .set({
      name: params.name,
      sortOrder: params.sortOrder,
    })
    .where(eq(classificationValues.id, valueId));

  return result;
}

export async function deleteClassificationValuesBySchemeIdNotInCodes(
  db: AppDatabase,
  schemeId: string,
  keepCodes: string[],
) {
  let result: void = undefined;

  if (keepCodes.length === 0) {
    await db
      .delete(classificationValues)
      .where(eq(classificationValues.schemeId, schemeId));
    return result;
  }

  await db
    .delete(classificationValues)
    .where(
      and(
        eq(classificationValues.schemeId, schemeId),
        notInArray(classificationValues.code, keepCodes),
      ),
    );

  return result;
}

export async function listClassificationSchemesByPortfolioCode(
  db: AppDatabase,
  portfolioCode: string,
) {
  let result: (typeof classificationSchemes.$inferSelect)[] = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  result = await db
    .select()
    .from(classificationSchemes)
    .where(eq(classificationSchemes.portfolioId, portfolio.id));
  return result;
}

export async function updateClassificationSchemeName(
  db: AppDatabase,
  schemeId: string,
  name: string,
) {
  let result: void = undefined;

  await db
    .update(classificationSchemes)
    .set({ name })
    .where(eq(classificationSchemes.id, schemeId));

  return result;
}

export async function deleteClassificationSchemeById(
  db: AppDatabase,
  schemeId: string,
) {
  let result: void = undefined;

  await db
    .delete(classificationSchemes)
    .where(eq(classificationSchemes.id, schemeId));

  return result;
}

export async function setInstrumentClassifications(
  db: AppDatabase,
  instrumentId: string,
  classificationValueIds: string[],
) {
  let result: void = undefined;

  await db
    .delete(instrumentClassifications)
    .where(eq(instrumentClassifications.instrumentId, instrumentId));

  if (classificationValueIds.length === 0) {
    return result;
  }

  const rows = classificationValueIds.map((classificationValueId) => {
    let result = {
      instrumentId,
      classificationValueId,
    };
    return result;
  });
  await db.insert(instrumentClassifications).values(rows);

  return result;
}

export async function listAnalysisSchemesForPortfolio(
  db: AppDatabase,
  portfolioCode: string,
) {
  let result: Array<{ schemeCode: string; schemeName: string }> = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select({
      schemeCode: classificationSchemes.code,
      schemeName: classificationSchemes.name,
      createdAt: classificationSchemes.createdAt,
    })
    .from(classificationSchemes)
    .where(eq(classificationSchemes.portfolioId, portfolio.id))
    .orderBy(asc(classificationSchemes.createdAt));

  for (const row of rows) {
    if (!isIdecoAnalysisSchemeCode(row.schemeCode)) {
      continue;
    }
    result.push({
      schemeCode: row.schemeCode,
      schemeName: row.schemeName,
    });
  }

  return result;
}

export async function getTagsForInstruments(
  db: AppDatabase,
  instrumentIds: string[],
) {
  type InstrumentTag = {
    schemeCode: string;
    schemeName: string;
    valueCode: string;
    valueName: string;
    sortOrder: number;
  };

  let result = new Map<string, InstrumentTag[]>();

  if (instrumentIds.length === 0) {
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
