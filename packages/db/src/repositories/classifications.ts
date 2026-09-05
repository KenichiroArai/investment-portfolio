import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import {
  buildClassificationGraph,
  collectSubtreeLinks,
  collectSubtreeValueIds,
  enrichClassificationValues,
  isIdecoAnalysisSchemeCode,
  isMonexAnalysisSchemeCode,
  validateLinkAddition,
  type CopyClassificationMode,
} from "@repo/shared";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import {
  classificationSchemes,
  classificationValueLinks,
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
  description?: string | null;
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

export async function listLinksForPortfolio(db: AppDatabase, portfolioId: string) {
  let result: (typeof classificationValueLinks.$inferSelect)[] = [];

  const rows = await db
    .select({
      parentValueId: classificationValueLinks.parentValueId,
      childValueId: classificationValueLinks.childValueId,
      sortOrder: classificationValueLinks.sortOrder,
    })
    .from(classificationValueLinks)
    .innerJoin(
      classificationValues,
      eq(classificationValueLinks.parentValueId, classificationValues.id),
    )
    .innerJoin(
      classificationSchemes,
      eq(classificationValues.schemeId, classificationSchemes.id),
    )
    .where(eq(classificationSchemes.portfolioId, portfolioId))
    .orderBy(
      asc(classificationValueLinks.parentValueId),
      asc(classificationValueLinks.sortOrder),
    );

  result = rows;
  return result;
}

async function listPortfolioGraphValues(db: AppDatabase, portfolioId: string) {
  let result: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    sortOrder: number;
    schemeId: string;
    schemeCode: string;
  }> = [];

  const rows = await db
    .select({
      id: classificationValues.id,
      code: classificationValues.code,
      name: classificationValues.name,
      description: classificationValues.description,
      sortOrder: classificationValues.sortOrder,
      schemeId: classificationValues.schemeId,
      schemeCode: classificationSchemes.code,
    })
    .from(classificationValues)
    .innerJoin(
      classificationSchemes,
      eq(classificationValues.schemeId, classificationSchemes.id),
    )
    .where(eq(classificationSchemes.portfolioId, portfolioId));

  result = rows;
  return result;
}

async function findPortfolioIdForValue(db: AppDatabase, valueId: string) {
  let result: string | null = null;

  const rows = await db
    .select({ portfolioId: classificationSchemes.portfolioId })
    .from(classificationValues)
    .innerJoin(
      classificationSchemes,
      eq(classificationValues.schemeId, classificationSchemes.id),
    )
    .where(eq(classificationValues.id, valueId))
    .limit(1);

  result = rows[0]?.portfolioId ?? null;
  return result;
}

export async function addClassificationLink(
  db: AppDatabase,
  params: { parentValueId: string; childValueId: string; sortOrder?: number },
) {
  let result:
    | { ok: true; link: typeof classificationValueLinks.$inferSelect }
    | { ok: false; reason: string } = { ok: false, reason: "Unknown error" };

  const parentPortfolioId = await findPortfolioIdForValue(db, params.parentValueId);
  const childPortfolioId = await findPortfolioIdForValue(db, params.childValueId);

  if (!parentPortfolioId || !childPortfolioId) {
    result = { ok: false, reason: "分類値が見つかりません。" };
    return result;
  }

  if (parentPortfolioId !== childPortfolioId) {
    result = { ok: false, reason: "異なる口座の分類値はリンクできません。" };
    return result;
  }

  const graphValues = await listPortfolioGraphValues(db, parentPortfolioId);
  const links = await listLinksForPortfolio(db, parentPortfolioId);
  const graph = buildClassificationGraph(graphValues, links);
  const validation = validateLinkAddition(
    graph,
    params.parentValueId,
    params.childValueId,
  );

  if (!validation.ok) {
    result = { ok: false, reason: validation.reason };
    return result;
  }

  const link = {
    parentValueId: params.parentValueId,
    childValueId: params.childValueId,
    sortOrder: params.sortOrder ?? 0,
  };
  await db.insert(classificationValueLinks).values(link);
  result = { ok: true, link };
  return result;
}

export async function removeClassificationLink(
  db: AppDatabase,
  params: { parentValueId: string; childValueId: string },
) {
  let result = false;

  await db
    .delete(classificationValueLinks)
    .where(
      and(
        eq(classificationValueLinks.parentValueId, params.parentValueId),
        eq(classificationValueLinks.childValueId, params.childValueId),
      ),
    );

  result = true;
  return result;
}

export async function copyClassificationValue(
  db: AppDatabase,
  valueId: string,
  params: {
    mode: CopyClassificationMode;
    code?: string;
    name?: string;
  },
) {
  let result:
    | {
        ok: true;
        value: typeof classificationValues.$inferSelect;
        copiedValueIds: string[];
      }
    | { ok: false; reason: string } = { ok: false, reason: "Unknown error" };

  const sourceValue = await findClassificationValueById(db, valueId);
  if (!sourceValue) {
    result = { ok: false, reason: "分類値が見つかりません。" };
    return result;
  }

  const portfolioId = await findPortfolioIdForValue(db, valueId);
  /* v8 ignore start */
  if (!portfolioId) {
    result = { ok: false, reason: "分類値が見つかりません。" };
    return result;
  }
  /* v8 ignore stop */

  const graphValues = await listPortfolioGraphValues(db, portfolioId);
  const links = await listLinksForPortfolio(db, portfolioId);
  const graph = buildClassificationGraph(graphValues, links);
  const sourceIds = collectSubtreeValueIds(valueId, graph, params.mode);
  const sourceIdSet = new Set(sourceIds);
  const subtreeLinks = collectSubtreeLinks(sourceIdSet, links);
  const idMap = new Map<string, string>();
  const copiedValueIds: string[] = [];

  for (const sourceId of sourceIds) {
    const source = graphValues.find((value) => value.id === sourceId);
    /* v8 ignore start */
    if (!source) {
      continue;
    }
    /* v8 ignore stop */

    const isRoot = sourceId === valueId;
    let nextCode = `${source.code}_copy`;
    let nextName = `${source.name}（コピー）`;

    if (isRoot && params.code) {
      nextCode = params.code;
    }
    if (isRoot && params.name) {
      nextName = params.name;
    }

    const existing = await findClassificationValueBySchemeAndCode(
      db,
      source.schemeId,
      nextCode,
    );
    if (existing) {
      result = { ok: false, reason: `コード ${nextCode} は既に存在します。` };
      return result;
    }

    const copied = await createClassificationValue(db, {
      schemeId: source.schemeId,
      code: nextCode,
      name: nextName,
      description: source.description ?? null,
      sortOrder: source.sortOrder,
    });
    idMap.set(sourceId, copied.id);
    copiedValueIds.push(copied.id);
  }

  for (const link of subtreeLinks) {
    const parentValueId = idMap.get(link.parentValueId);
    const childValueId = idMap.get(link.childValueId);
    /* v8 ignore start */
    if (!parentValueId || !childValueId) {
      continue;
    }
    /* v8 ignore stop */

    await db.insert(classificationValueLinks).values({
      parentValueId,
      childValueId,
      sortOrder: link.sortOrder,
    });
  }

  const rootCopiedId = idMap.get(valueId);
  /* v8 ignore start */
  if (!rootCopiedId) {
    result = { ok: false, reason: "コピーに失敗しました。" };
    return result;
  }

  const copiedRoot = await findClassificationValueById(db, rootCopiedId);
  if (!copiedRoot) {
    result = { ok: false, reason: "コピーに失敗しました。" };
    return result;
  }
  /* v8 ignore stop */

  result = { ok: true, value: copiedRoot, copiedValueIds };
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
    values: ReturnType<typeof enrichClassificationValues>;
    links: Array<{
      parentValueId: string;
      childValueId: string;
      sortOrder: number;
    }>;
  };

  let result: SchemeWithValues[] = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const schemes = await listClassificationSchemesByPortfolioCode(db, portfolioCode);
  const graphValues = await listPortfolioGraphValues(db, portfolio.id);
  const links = await listLinksForPortfolio(db, portfolio.id);
  const linkDtos = links.map((link) => ({
    parentValueId: link.parentValueId,
    childValueId: link.childValueId,
    sortOrder: link.sortOrder,
  }));

  for (const scheme of schemes) {
    const schemeValues = graphValues.filter((value) => value.schemeId === scheme.id);
    result.push({
      id: scheme.id,
      code: scheme.code,
      name: scheme.name,
      values: enrichClassificationValues(schemeValues, linkDtos),
      links: linkDtos,
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
  const description =
    params.description === undefined
      ? null
      : params.description === null || params.description.trim() === ""
        ? null
        : params.description.trim();

  let result = {
    id: newId(),
    schemeId: params.schemeId,
    code: params.code,
    name: params.name,
    description,
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
  params: { name: string; sortOrder: number; description?: string | null },
) {
  let result: void = undefined;

  const patch: {
    name: string;
    sortOrder: number;
    description?: string | null;
  } = {
    name: params.name,
    sortOrder: params.sortOrder,
  };

  if (params.description !== undefined) {
    patch.description =
      params.description === null || params.description.trim() === ""
        ? null
        : params.description.trim();
  }

  await db
    .update(classificationValues)
    .set(patch)
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
