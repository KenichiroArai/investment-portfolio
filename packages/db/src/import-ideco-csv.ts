import {
  buildIdecoKakeiboMetrics,
  IDECO_PRODUCT_TYPES,
  parseIdecoKakeiboCsv,
  type IdecoKakeiboCsvRow,
  type ParseIdecoKakeiboCsvResult,
} from "@repo/shared";

import type { AppDatabase } from "./client";
import {
  createClassificationScheme,
  createClassificationValue,
  findClassificationValueBySchemeAndCode,
  findSchemeByPortfolioCodeAndSchemeCode,
  setInstrumentClassifications,
} from "./repositories/classifications";
import {
  createInstrument,
  findInstrumentByName,
} from "./repositories/instruments";
import {
  createPortfolio,
  findPortfolioByCode,
} from "./repositories/portfolios";
import { getCurrentSnapshot, replaceCurrentSnapshot } from "./repositories/snapshots";

const IDECO_PORTFOLIO_CODE = "ideco";
const IDECO_PORTFOLIO_NAME = "iDeCo";
const PRODUCT_TYPE_SCHEME_CODE = "ideco_product_type";
const PRODUCT_TYPE_SCHEME_NAME = "商品タイプ";

export type ImportIdecoKakeiboCsvResult = {
  asOfDate: string;
  lineCount: number;
  createdInstruments: number;
  reusedInstruments: number;
};

async function ensureIdecoPortfolio(db: AppDatabase) {
  let result!: Awaited<ReturnType<typeof createPortfolio>>;

  const existing = await findPortfolioByCode(db, IDECO_PORTFOLIO_CODE);
  if (existing) {
    result = existing;
    return result;
  }

  result = await createPortfolio(db, {
    code: IDECO_PORTFOLIO_CODE,
    name: IDECO_PORTFOLIO_NAME,
    kind: "ideco",
  });
  return result;
}

async function ensureProductTypeScheme(db: AppDatabase) {
  let result: Awaited<ReturnType<typeof findSchemeByPortfolioCodeAndSchemeCode>> = null;

  let scheme = await findSchemeByPortfolioCodeAndSchemeCode(
    db,
    IDECO_PORTFOLIO_CODE,
    PRODUCT_TYPE_SCHEME_CODE,
  );

  if (!scheme) {
    scheme = await createClassificationScheme(db, {
      portfolioCode: IDECO_PORTFOLIO_CODE,
      code: PRODUCT_TYPE_SCHEME_CODE,
      name: PRODUCT_TYPE_SCHEME_NAME,
    });
  }

  if (!scheme) {
    return result;
  }

  for (const productType of IDECO_PRODUCT_TYPES) {
    const existingValue = await findClassificationValueBySchemeAndCode(
      db,
      scheme.id,
      productType.code,
    );
    if (existingValue) {
      continue;
    }

    await createClassificationValue(db, {
      schemeId: scheme.id,
      code: productType.code,
      name: productType.name,
      sortOrder: productType.sortOrder,
    });
  }

  result = scheme;
  return result;
}

async function resolveInstrumentId(
  db: AppDatabase,
  row: IdecoKakeiboCsvRow,
  schemeId: string,
  counters: { created: number; reused: number },
) {
  let result: string | null = null;

  const classificationValue = await findClassificationValueBySchemeAndCode(
    db,
    schemeId,
    row.productTypeCode,
  );
  if (!classificationValue) {
    return result;
  }

  let instrument = await findInstrumentByName(db, row.instrumentName);
  if (!instrument) {
    instrument = await createInstrument(db, {
      name: row.instrumentName,
      instrumentType: "mutual_fund",
      currency: "JPY",
    });
    counters.created += 1;
  } else {
    counters.reused += 1;
  }

  await setInstrumentClassifications(db, instrument.id, [
    classificationValue.id,
  ]);

  result = instrument.id;
  return result;
}

export async function importIdecoKakeiboCsvFromParsed(
  db: AppDatabase,
  parsed: ParseIdecoKakeiboCsvResult,
): Promise<ImportIdecoKakeiboCsvResult | null> {
  let result: ImportIdecoKakeiboCsvResult | null = null;

  await ensureIdecoPortfolio(db);
  const scheme = await ensureProductTypeScheme(db);
  if (!scheme) {
    return result;
  }

  const counters = { created: 0, reused: 0 };
  const lines: Array<{
    instrumentId: string;
    sortOrder: number;
    quantity: number;
    marketValueMinor: number;
    bookValueMinor: number;
    metrics: ReturnType<typeof buildIdecoKakeiboMetrics>;
  }> = [];

  for (const row of parsed.rows) {
    const instrumentId = await resolveInstrumentId(db, row, scheme.id, counters);
    if (!instrumentId) {
      return result;
    }

    lines.push({
      instrumentId,
      sortOrder: row.rowNumber,
      quantity: row.quantity,
      marketValueMinor: row.marketValueMinor,
      bookValueMinor: row.bookValueMinor,
      metrics: buildIdecoKakeiboMetrics({
        unitPricePerTenThousandLots: row.unitPricePerTenThousandLots,
        unrealizedGainMinor: row.unrealizedGainMinor,
        unrealizedGainRate: row.unrealizedGainRate,
      }),
    });
  }

  const snapshot = await replaceCurrentSnapshot(db, {
    portfolioCode: IDECO_PORTFOLIO_CODE,
    asOfDate: parsed.asOfDate,
    lines,
  });

  if (!snapshot) {
    return result;
  }

  result = {
    asOfDate: parsed.asOfDate,
    lineCount: parsed.rows.length,
    createdInstruments: counters.created,
    reusedInstruments: counters.reused,
  };
  return result;
}

export async function importIdecoKakeiboCsv(
  db: AppDatabase,
  csvContent: string,
): Promise<ImportIdecoKakeiboCsvResult | null> {
  let result: ImportIdecoKakeiboCsvResult | null = null;

  const parsed = parseIdecoKakeiboCsv(csvContent);
  result = await importIdecoKakeiboCsvFromParsed(db, parsed);
  return result;
}

export async function getIdecoCurrentSnapshot(db: AppDatabase) {
  let result = await getCurrentSnapshot(db, IDECO_PORTFOLIO_CODE);
  return result;
}
