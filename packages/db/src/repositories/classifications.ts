import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { isIdecoAnalysisSchemeCode, isMonexAnalysisSchemeCode } from "@repo/shared";

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

export async function findClassificationValueById(
  db: AppDatabase,
  valueId: string,
) {
  let result: (typeof classificationValues.$inferSelect) | null = null;

  const rows = await db
    .select()
    .from(classificationValues)
    .where(eq(classificationValues.id, valueId))
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export async function deleteClassificationValueById(
  db: AppDatabase,
  valueId: string,
) {
  let result = false;

  const existing = await findClassificationValueById(db, valueId);
  if (!existing) {
    return result;
  }

  await db
    .delete(classificationValues)
    .where(eq(classificationValues.id, valueId));
  result = true;
  return result;
}

export async function listSchemesWithValuesForPortfolio(
  db: AppDatabase,
  portfolioCode: string,
) {
  type SchemeWithValues = {
    id: string;
    code: string;
    name: string;
    values: Array<{
      id: string;
      code: string;
      name: string;
      sortOrder: number;
    }>;
  };

  let result: SchemeWithValues[] = [];

  const schemes = await listClassificationSchemesByPortfolioCode(db, portfolioCode);
  for (const scheme of schemes) {
    const values = await listClassificationValuesBySchemeId(db, scheme.id);
    result.push({
      id: scheme.id,
      code: scheme.code,
      name: scheme.name,
      values: values
        .map((value) => ({
          id: value.id,
          code: value.code,
          name: value.name,
          sortOrder: value.sortOrder,
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    });
  }

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

export async function listInstrumentClassificationValueIds(
  db: AppDatabase,
  instrumentId: string,
) {
  let result: string[] = [];

  const rows = await db
    .select({
      classificationValueId: instrumentClassifications.classificationValueId,
    })
    .from(instrumentClassifications)
    .where(eq(instrumentClassifications.instrumentId, instrumentId));
  result = rows.map((row) => row.classificationValueId);

  return result;
}

export type InstrumentClassificationWeightInput = {
  classificationValueId: string;
  allocationWeight: number;
};

export async function setInstrumentClassifications(
  db: AppDatabase,
  instrumentId: string,
  classificationValueIds: string[],
) {
  let result: void = undefined;

  const weights = classificationValueIds.map((classificationValueId) => {
    let weightInput: InstrumentClassificationWeightInput = {
      classificationValueId,
      allocationWeight: 1,
    };
    return weightInput;
  });
  await setInstrumentClassificationsWithWeights(db, instrumentId, weights);
  return result;
}

export async function setInstrumentClassificationsWithWeights(
  db: AppDatabase,
  instrumentId: string,
  weights: InstrumentClassificationWeightInput[],
) {
  let result: void = undefined;

  await db
    .delete(instrumentClassifications)
    .where(eq(instrumentClassifications.instrumentId, instrumentId));

  if (weights.length === 0) {
    return result;
  }

  let total = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight.allocationWeight) || weight.allocationWeight < 0) {
      continue;
    }
    total += weight.allocationWeight;
  }

  if (total <= 0 || !Number.isFinite(total)) {
    return result;
  }

  const rows = weights
    .filter(
      (weight) =>
        Number.isFinite(weight.allocationWeight) && weight.allocationWeight > 0,
    )
    .map((weight) => {
      let row = {
        instrumentId,
        classificationValueId: weight.classificationValueId,
        allocationWeight: weight.allocationWeight / total,
      };
      return row;
    });

  /* v8 ignore start */
  if (rows.length === 0) {
    return result;
  }
  /* v8 ignore stop */

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
    .orderBy(
      asc(classificationSchemes.createdAt),
      asc(classificationSchemes.code),
    );

  for (const row of rows) {
    if (portfolio.kind === "ideco" && !isIdecoAnalysisSchemeCode(row.schemeCode)) {
      continue;
    }
    if (portfolio.kind === "monex" && !isMonexAnalysisSchemeCode(row.schemeCode)) {
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
    allocationWeight: number | null;
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
      allocationWeight: instrumentClassifications.allocationWeight,
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
      allocationWeight: row.allocationWeight,
    });
    result.set(row.instrumentId, existing);
  }

  return result;
}
