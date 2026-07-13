import { and, eq, inArray, isNull, like, or } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import {
  holdingLineMetrics,
  holdingLines,
  instrumentAttributes,
  instrumentClassifications,
  instruments,
  portfolios,
  targetPortfolioWeights,
} from "../schema/index";
import { findPortfolioByCode } from "./portfolios";

export type CreateInstrumentParams = {
  portfolioCode?: string;
  accountId?: string;
  name: string;
  instrumentType?: string;
  currency?: string;
  externalId?: string | null;
};

async function resolvePortfolioCodeForInstrument(
  db: AppDatabase,
  portfolioCode?: string,
) {
  let result = "legacy";

  if (portfolioCode && portfolioCode.trim() !== "") {
    result = portfolioCode;
    return result;
  }

  const ideco = await findPortfolioByCode(db, "ideco");
  if (ideco) {
    result = ideco.code;
    return result;
  }

  const firstRows = await db.select({ code: portfolios.code }).from(portfolios).limit(1);
  if (firstRows[0]) {
    result = firstRows[0].code;
    return result;
  }

  return result;
}

async function resolvePortfolioIdForInstrument(
  db: AppDatabase,
  portfolioCode?: string,
) {
  let result: string | null = null;

  if (portfolioCode && portfolioCode.trim() !== "") {
    let named = await findPortfolioByCode(db, portfolioCode);
    if (!named) {
      await db.insert(portfolios).values({
        id: newId(),
        code: portfolioCode,
        name: `${portfolioCode} portfolio`,
        kind: "taxable",
        createdAt: nowIso(),
      });
      named = await findPortfolioByCode(db, portfolioCode);
      /* v8 ignore start */
      if (!named) {
        return result;
      }
      /* v8 ignore stop */
    }
    result = named.id;
    return result;
  }

  const ideco = await findPortfolioByCode(db, "ideco");
  if (ideco) {
    result = ideco.id;
    return result;
  }

  const firstRows = await db.select({ id: portfolios.id }).from(portfolios).limit(1);
  if (firstRows[0]) {
    result = firstRows[0].id;
    return result;
  }

  await db.insert(portfolios).values({
    id: newId(),
    code: "legacy",
    name: "Legacy Portfolio",
    kind: "taxable",
    createdAt: nowIso(),
  });
  const created = await findPortfolioByCode(db, "legacy");
  /* v8 ignore next */
  result = created?.id ?? null;
  return result;
}

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
  let result: (typeof instruments.$inferSelect) | null = null;

  const portfolioId = await resolvePortfolioIdForInstrument(db, params.portfolioCode);
  /* v8 ignore start */
  if (!portfolioId) {
    return result;
  }
  /* v8 ignore stop */

  const row = {
    id: newId(),
    portfolioId,
    accountId: params.accountId ?? `${params.portfolioCode ?? "legacy"}:unknown`,
    name: params.name,
    instrumentType: params.instrumentType ?? "mutual_fund",
    currency: params.currency ?? "JPY",
    externalId: params.externalId ?? null,
    createdAt: nowIso(),
  };

  await db.insert(instruments).values(row);
  result = row;
  return result;
}

export async function upsertInstrument(
  db: AppDatabase,
  params: CreateInstrumentParams,
) {
  let result: Awaited<ReturnType<typeof createInstrument>> | null = null;

  const portfolioCode = await resolvePortfolioCodeForInstrument(db, params.portfolioCode);
  const existing = await findInstrumentByIdentity(db, {
    portfolioCode,
    name: params.name,
    instrumentType: params.instrumentType,
    currency: params.currency,
    externalId: params.externalId,
  });
  if (existing) {
    result = existing;
    return result;
  }

  result = await createInstrument(db, {
    ...params,
    portfolioCode,
    accountId: params.accountId ?? `${portfolioCode}:unknown`,
  });
  return result;
}

export type ListInstrumentsParams = {
  portfolioCode?: string;
  accountId?: string;
  searchQuery?: string;
};

export async function listInstruments(
  db: AppDatabase,
  params?: ListInstrumentsParams | string,
) {
  let result: (typeof instruments.$inferSelect)[] = [];
  const normalized =
    typeof params === "string" ? { searchQuery: params } : params;
  const searchQuery = normalized?.searchQuery;
  let portfolioId: string | null = null;

  if (normalized?.portfolioCode) {
    const portfolio = await findPortfolioByCode(db, normalized.portfolioCode);
    if (!portfolio) {
      return result;
    }
    portfolioId = portfolio.id;
  }

  const whereClause =
    portfolioId && normalized?.accountId
      ? and(
          eq(instruments.portfolioId, portfolioId),
          eq(instruments.accountId, normalized.accountId),
        )
      : portfolioId
        ? eq(instruments.portfolioId, portfolioId)
        : undefined;

  if (searchQuery && searchQuery.trim() !== "") {
    const pattern = `%${searchQuery.trim()}%`;
    const query = db
      .select()
      .from(instruments)
      .orderBy(instruments.name);
    result = whereClause
      ? await query.where(and(whereClause, like(instruments.name, pattern)))
      : await query.where(like(instruments.name, pattern));
    return result;
  }

  if (whereClause) {
    result = await db
      .select()
      .from(instruments)
      .where(whereClause)
      .orderBy(instruments.name);
    return result;
  }

  result = await db.select().from(instruments).orderBy(instruments.name);
  return result;
}

export type UpdateInstrumentParams = {
  accountId?: string;
  name: string;
  instrumentType?: string;
  currency?: string;
  externalId?: string | null;
};

export async function updateInstrument(
  db: AppDatabase,
  id: string,
  params: UpdateInstrumentParams,
) {
  let result: (typeof instruments.$inferSelect) | null = null;

  const existing = await findInstrumentById(db, id);
  if (!existing) {
    return result;
  }

  await db
    .update(instruments)
    .set({
      name: params.name,
      accountId: params.accountId ?? existing.accountId,
      instrumentType: params.instrumentType ?? existing.instrumentType,
      currency: params.currency ?? existing.currency,
      externalId:
        params.externalId !== undefined ? params.externalId : existing.externalId,
    })
    .where(eq(instruments.id, id));

  result = {
    ...existing,
    name: params.name,
    accountId: params.accountId ?? existing.accountId,
    instrumentType: params.instrumentType ?? existing.instrumentType,
    currency: params.currency ?? existing.currency,
    externalId:
      params.externalId !== undefined ? params.externalId : existing.externalId,
  };
  return result;
}

export async function isInstrumentUsedInHoldings(
  db: AppDatabase,
  instrumentId: string,
) {
  let result = false;

  const rows = await db
    .select({ id: holdingLines.id })
    .from(holdingLines)
    .where(eq(holdingLines.instrumentId, instrumentId))
    .limit(1);
  result = rows.length > 0;
  return result;
}

export async function deleteInstrument(db: AppDatabase, id: string) {
  let result: "deleted" | "not_found" | "in_use" = "not_found";

  const existing = await findInstrumentById(db, id);
  if (!existing) {
    return result;
  }

  const inUse = await isInstrumentUsedInHoldings(db, id);
  if (inUse) {
    result = "in_use";
    return result;
  }

  await db.delete(instruments).where(eq(instruments.id, id));
  result = "deleted";
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

export type FindInstrumentByIdentityParams = {
  portfolioCode?: string;
  name: string;
  instrumentType?: string;
  currency?: string;
  externalId?: string | null;
};

function buildExternalIdMatch(externalId?: string | null) {
  let result = undefined;
  const normalized = externalId ?? "";
  if (normalized === "") {
    result = or(isNull(instruments.externalId), eq(instruments.externalId, ""));
    return result;
  }
  result = eq(instruments.externalId, normalized);
  return result;
}

export async function findInstrumentByIdentity(
  db: AppDatabase,
  params: FindInstrumentByIdentityParams,
) {
  let result: (typeof instruments.$inferSelect) | null = null;

  const portfolioCode = await resolvePortfolioCodeForInstrument(db, params.portfolioCode);
  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const instrumentType = params.instrumentType ?? "mutual_fund";
  const currency = params.currency ?? "JPY";
  const rows = await db
    .select()
    .from(instruments)
    .where(
      and(
        eq(instruments.portfolioId, portfolio.id),
        eq(instruments.name, params.name),
        eq(instruments.instrumentType, instrumentType),
        eq(instruments.currency, currency),
        buildExternalIdMatch(params.externalId),
      ),
    )
    .limit(1);
  result = rows[0] ?? null;
  return result;
}

export type MergeInstrumentsResult = {
  canonicalId: string;
  mergedCount: number;
};

export async function mergeInstruments(
  db: AppDatabase,
  canonicalId: string,
  loserIds: string[],
) {
  let result: MergeInstrumentsResult | null = null;

  const canonical = await findInstrumentById(db, canonicalId);
  if (!canonical) {
    return result;
  }

  const uniqueLoserIds = [...new Set(loserIds)].filter((id) => id !== canonicalId);
  if (uniqueLoserIds.length === 0) {
    result = { canonicalId, mergedCount: 0 };
    return result;
  }

  db.transaction((tx) => {
    let txResult: void = undefined;

    for (const loserId of uniqueLoserIds) {
      const loserLines = tx
        .select()
        .from(holdingLines)
        .where(eq(holdingLines.instrumentId, loserId))
        .all();

      for (const loserLine of loserLines) {
        const conflicting = tx
          .select()
          .from(holdingLines)
          .where(
            and(
              eq(holdingLines.snapshotId, loserLine.snapshotId),
              eq(holdingLines.instrumentId, canonicalId),
              eq(holdingLines.accountId, loserLine.accountId),
            ),
          )
          .all()[0];

        if (conflicting) {
          tx.update(holdingLines)
            .set({
              quantity: conflicting.quantity + loserLine.quantity,
              marketValueMinor: conflicting.marketValueMinor + loserLine.marketValueMinor,
              bookValueMinor:
                conflicting.bookValueMinor == null && loserLine.bookValueMinor == null
                  ? null
                  : (conflicting.bookValueMinor == null ? 0 : conflicting.bookValueMinor) +
                    (loserLine.bookValueMinor == null ? 0 : loserLine.bookValueMinor),
            })
            .where(eq(holdingLines.id, conflicting.id))
            .run();
          tx.delete(holdingLineMetrics)
            .where(eq(holdingLineMetrics.holdingLineId, loserLine.id))
            .run();
          tx.delete(holdingLines).where(eq(holdingLines.id, loserLine.id)).run();
          continue;
        }

        tx.update(holdingLines)
          .set({ instrumentId: canonicalId })
          .where(eq(holdingLines.id, loserLine.id))
          .run();
      }
    }

    for (const loserId of uniqueLoserIds) {
      const loserWeights = tx
        .select()
        .from(targetPortfolioWeights)
        .where(eq(targetPortfolioWeights.instrumentId, loserId))
        .all();
      for (const weight of loserWeights) {
        const canonicalWeight = tx
          .select()
          .from(targetPortfolioWeights)
          .where(
            and(
              eq(targetPortfolioWeights.portfolioId, weight.portfolioId),
              eq(targetPortfolioWeights.instrumentId, canonicalId),
            ),
          )
          .all()[0];
        if (canonicalWeight) {
          tx
            .update(targetPortfolioWeights)
            .set({
              targetRatio: canonicalWeight.targetRatio + weight.targetRatio,
              updatedAt: nowIso(),
            })
            .where(eq(targetPortfolioWeights.id, canonicalWeight.id))
            .run();
          tx.delete(targetPortfolioWeights).where(eq(targetPortfolioWeights.id, weight.id)).run();
          continue;
        }
        tx
          .update(targetPortfolioWeights)
          .set({ instrumentId: canonicalId })
          .where(eq(targetPortfolioWeights.id, weight.id))
          .run();
      }
    }

    for (const loserId of uniqueLoserIds) {
      const loserClassifications = tx
        .select()
        .from(instrumentClassifications)
        .where(eq(instrumentClassifications.instrumentId, loserId))
        .all();
      for (const classification of loserClassifications) {
        tx
          .insert(instrumentClassifications)
          .values({
            instrumentId: canonicalId,
            classificationValueId: classification.classificationValueId,
          })
          .onConflictDoNothing()
          .run();
      }
      tx
        .delete(instrumentClassifications)
        .where(eq(instrumentClassifications.instrumentId, loserId))
        .run();
    }

    for (const loserId of uniqueLoserIds) {
      const canonicalAttributeCodes = new Set(
        tx
          .select({ code: instrumentAttributes.code })
          .from(instrumentAttributes)
          .where(eq(instrumentAttributes.instrumentId, canonicalId))
          .all()
          .map((row) => row.code),
      );
      const loserAttributes = tx
        .select()
        .from(instrumentAttributes)
        .where(eq(instrumentAttributes.instrumentId, loserId))
        .all();
      for (const attribute of loserAttributes) {
        if (canonicalAttributeCodes.has(attribute.code)) {
          tx.delete(instrumentAttributes).where(eq(instrumentAttributes.id, attribute.id)).run();
          continue;
        }
        tx
          .update(instrumentAttributes)
          .set({ instrumentId: canonicalId })
          .where(eq(instrumentAttributes.id, attribute.id))
          .run();
        canonicalAttributeCodes.add(attribute.code);
      }
    }

    tx.delete(instruments).where(inArray(instruments.id, uniqueLoserIds)).run();

    return txResult;
  });

  result = { canonicalId, mergedCount: uniqueLoserIds.length };
  return result;
}

export type FindInstrumentByNameParams = {
  portfolioCode?: string;
  accountId?: string;
  name: string;
};

export async function findInstrumentByName(
  db: AppDatabase,
  params: FindInstrumentByNameParams | string,
) {
  let result: (typeof instruments.$inferSelect) | null = null;
  const normalized: FindInstrumentByNameParams =
    typeof params === "string" ? { name: params } : params;

  const baseQuery = db.select().from(instruments);
  let rows: (typeof instruments.$inferSelect)[] = [];
  if (normalized.portfolioCode && normalized.accountId) {
    const portfolio = await findPortfolioByCode(db, normalized.portfolioCode);
    if (!portfolio) {
      return result;
    }
    rows = await baseQuery
      .where(
        and(
          eq(instruments.portfolioId, portfolio.id),
          eq(instruments.accountId, normalized.accountId),
          eq(instruments.name, normalized.name),
        ),
      )
      .limit(1);
  } else {
    rows = await baseQuery.where(eq(instruments.name, normalized.name)).limit(1);
  }
  result = rows[0] ?? null;
  return result;
}

export async function findInstrumentByAttributeTextValue(
  db: AppDatabase,
  attributeCode: string,
  textValue: string,
) {
  let result: {
    id: string;
    name: string;
    instrumentType: string;
    currency: string;
    externalId: string | null;
    createdAt: string;
  } | null = null;

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

export type IdecoPasteInstrumentRow = {
  id: string;
  name: string;
  shortName: string | null;
};

export type MonexPasteInstrumentRow = {
  id: string;
  name: string;
  ticker: string | null;
};

export async function listIdecoInstrumentsForPaste(db: AppDatabase) {
  let result: IdecoPasteInstrumentRow[] = [];

  const portfolio = await findPortfolioByCode(db, "ideco");
  const rows = portfolio
    ? await db
        .select()
        .from(instruments)
        .where(eq(instruments.portfolioId, portfolio.id))
        .orderBy(instruments.name)
    : await db.select().from(instruments).orderBy(instruments.name);
  const instrumentIds = rows.map((row) => row.id);
  const attributesByInstrumentId = await getAttributesForInstruments(db, instrumentIds);

  for (const row of rows) {
    const attributes = attributesByInstrumentId.get(row.id) ?? [];
    const shortNameAttribute = attributes.find((attribute) => attribute.code === "short_name");
    let item: IdecoPasteInstrumentRow = {
      id: row.id,
      name: row.name,
      shortName: shortNameAttribute?.textValue ?? null,
    };
    result.push(item);
  }

  return result;
}

export async function listMonexInstrumentsForPaste(db: AppDatabase) {
  let result: MonexPasteInstrumentRow[] = [];

  const portfolio = await findPortfolioByCode(db, "monex");
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select()
    .from(instruments)
    .where(eq(instruments.portfolioId, portfolio.id))
    .orderBy(instruments.name);
  const instrumentIds = rows.map((row) => row.id);
  const attributesByInstrumentId = await getAttributesForInstruments(db, instrumentIds);

  for (const row of rows) {
    const attributes = attributesByInstrumentId.get(row.id) ?? [];
    const tickerAttribute = attributes.find((attribute) => attribute.code === "ticker");
    let item: MonexPasteInstrumentRow = {
      id: row.id,
      name: row.name,
      ticker: tickerAttribute?.textValue ?? null,
    };
    result.push(item);
  }

  return result;
}
