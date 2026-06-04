import { eq } from "drizzle-orm";

import type { AppDatabase } from "./client";
import { nowIso } from "./id";
import {
  classificationSchemes,
  classificationValues,
  instrumentClassifications,
  instruments,
  portfolios,
} from "./schema/index";
import { findPortfolioByCode } from "./repositories/portfolios";
import { replaceCurrentSnapshot } from "./repositories/snapshots";

/** サンプル行であることを DB 上で識別するための固定 ID */
export const SAMPLE_IDS = {
  portfolioId: "sample-portfolio-ideco",
  schemeRegionId: "sample-scheme-region",
  valueJapanId: "sample-value-japan",
  instrumentId: "sample-instrument",
} as const;

const SAMPLE_PORTFOLIO_NAME = "iDeCo（サンプル）";
const SAMPLE_INSTRUMENT_NAME = "（サンプル）eMAXIS Slim 国内株式(TOPIX)";
const SAMPLE_AS_OF_DATE = "2026-06-01";

export async function isSampleDataSeeded(db: AppDatabase): Promise<boolean> {
  const rows = await db
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(eq(portfolios.id, SAMPLE_IDS.portfolioId))
    .limit(1);
  const result = rows.length > 0;
  return result;
}

export type SeedSampleDataResult =
  | { status: "seeded" }
  | { status: "already_seeded" }
  | { status: "skipped"; reason: "non_sample_portfolio_exists" };

export async function seedSampleData(
  db: AppDatabase,
): Promise<SeedSampleDataResult> {
  const existing = await findPortfolioByCode(db, "ideco");
  if (existing) {
    if (existing.id === SAMPLE_IDS.portfolioId) {
      const result: SeedSampleDataResult = { status: "already_seeded" };
      return result;
    }
    const result: SeedSampleDataResult = {
      status: "skipped",
      reason: "non_sample_portfolio_exists",
    };
    return result;
  }

  const createdAt = nowIso();

  await db.insert(portfolios).values({
    id: SAMPLE_IDS.portfolioId,
    code: "ideco",
    name: SAMPLE_PORTFOLIO_NAME,
    kind: "ideco",
    createdAt,
  });

  await db.insert(classificationSchemes).values({
    id: SAMPLE_IDS.schemeRegionId,
    portfolioId: SAMPLE_IDS.portfolioId,
    code: "region",
    name: "地域",
    createdAt,
  });

  await db.insert(classificationValues).values({
    id: SAMPLE_IDS.valueJapanId,
    schemeId: SAMPLE_IDS.schemeRegionId,
    code: "japan",
    name: "日本",
    sortOrder: 0,
    createdAt,
  });

  await db.insert(instruments).values({
    id: SAMPLE_IDS.instrumentId,
    name: SAMPLE_INSTRUMENT_NAME,
    instrumentType: "mutual_fund",
    currency: "JPY",
    externalId: null,
    createdAt,
  });

  await db.insert(instrumentClassifications).values({
    instrumentId: SAMPLE_IDS.instrumentId,
    classificationValueId: SAMPLE_IDS.valueJapanId,
  });

  await replaceCurrentSnapshot(db, {
    portfolioCode: "ideco",
    asOfDate: SAMPLE_AS_OF_DATE,
    lines: [
      {
        instrumentId: SAMPLE_IDS.instrumentId,
        quantity: 100,
        marketValueMinor: 500_000,
        bookValueMinor: null,
      },
    ],
  });

  const result: SeedSampleDataResult = { status: "seeded" };
  return result;
}

export type ClearSampleDataResult =
  | { status: "cleared" }
  | { status: "not_present" };

export async function clearSampleData(
  db: AppDatabase,
): Promise<ClearSampleDataResult> {
  const present = await isSampleDataSeeded(db);
  if (!present) {
    const result: ClearSampleDataResult = { status: "not_present" };
    return result;
  }

  await db
    .delete(portfolios)
    .where(eq(portfolios.id, SAMPLE_IDS.portfolioId));

  await db
    .delete(instruments)
    .where(eq(instruments.id, SAMPLE_IDS.instrumentId));

  const result: ClearSampleDataResult = { status: "cleared" };
  return result;
}
