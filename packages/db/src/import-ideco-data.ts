import {
  buildIdecoInstrumentAttributes,
  buildIdecoKakeiboMetrics,
  IDECO_ASSET_CLASSES,
  IDECO_INSTRUMENT_ATTRIBUTE_CODES,
  IDECO_INSTRUMENT_STATUSES,
  IDECO_MAJOR_CATEGORIES,
  IDECO_PRODUCT_STYLES,
  IDECO_PRODUCT_TYPES,
  IDECO_REGIONS,
  IDECO_SCHEME_CODES,
  IDECO_SCHEME_NAMES,
  parseIdecoAnalysisCsv,
  parseIdecoHoldingsCsv,
  parseIdecoInstrumentsCsv,
  parseIdecoProductTypesCsv,
  resolveIdecoAnalysisTags,
  type IdecoClassificationDefinition,
  type IdecoInstrumentCsvRow,
  type ParseIdecoHoldingsCsvResult,
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
  findInstrumentByAttributeTextValue,
  findInstrumentByName,
  setInstrumentAttributes,
  upsertInstrument,
} from "./repositories/instruments";

async function resolveHoldingInstrumentId(
  db: AppDatabase,
  instrumentLookupName: string,
) {
  let result: string | null = null;

  const byName = await findInstrumentByName(db, instrumentLookupName);
  if (byName) {
    result = byName.id;
    return result;
  }

  const byShortName = await findInstrumentByAttributeTextValue(
    db,
    IDECO_INSTRUMENT_ATTRIBUTE_CODES.shortName,
    instrumentLookupName,
  );
  if (byShortName) {
    result = byShortName.id;
    return result;
  }

  return result;
}
import {
  createPortfolio,
  findPortfolioByCode,
} from "./repositories/portfolios";
import { getCurrentSnapshot, replaceCurrentSnapshot } from "./repositories/snapshots";

const IDECO_PORTFOLIO_CODE = "ideco";
const IDECO_PORTFOLIO_NAME = "iDeCo";

export type ImportIdecoDataResult = {
  asOfDate: string;
  lineCount: number;
  instrumentCount: number;
  createdInstruments: number;
  reusedInstruments: number;
};

export type IdecoImportFiles = {
  productTypesCsv: string;
  analysisCsv: string;
  instrumentsCsv: string;
  holdingsCsv: string;
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

async function ensureSchemeWithValues(
  db: AppDatabase,
  schemeCode: string,
  schemeName: string,
  values: IdecoClassificationDefinition[],
) {
  let result: string | null = null;

  let scheme = await findSchemeByPortfolioCodeAndSchemeCode(
    db,
    IDECO_PORTFOLIO_CODE,
    schemeCode,
  );

  if (!scheme) {
    scheme = await createClassificationScheme(db, {
      portfolioCode: IDECO_PORTFOLIO_CODE,
      code: schemeCode,
      name: schemeName,
    });
  }

  if (!scheme) {
    return result;
  }

  for (const value of values) {
    const existingValue = await findClassificationValueBySchemeAndCode(
      db,
      scheme.id,
      value.code,
    );
    if (existingValue) {
      continue;
    }

    await createClassificationValue(db, {
      schemeId: scheme.id,
      code: value.code,
      name: value.name,
      sortOrder: value.sortOrder,
    });
  }

  result = scheme.id;
  return result;
}

async function ensureClassificationValueId(
  db: AppDatabase,
  schemeCode: string,
  valueCode: string,
) {
  let result: string | null = null;

  const scheme = await findSchemeByPortfolioCodeAndSchemeCode(
    db,
    IDECO_PORTFOLIO_CODE,
    schemeCode,
  );
  if (!scheme) {
    return result;
  }

  const value = await findClassificationValueBySchemeAndCode(
    db,
    scheme.id,
    valueCode,
  );
  if (!value) {
    return result;
  }

  result = value.id;
  return result;
}

async function seedIdecoClassifications(
  db: AppDatabase,
  productTypeNames: string[],
) {
  let result: void = undefined;

  const productTypes = new Map<string, IdecoClassificationDefinition>();
  for (const definition of IDECO_PRODUCT_TYPES) {
    productTypes.set(definition.name, definition);
  }
  for (const name of productTypeNames) {
    const definition = IDECO_PRODUCT_TYPES.find((item) => item.name === name);
    if (definition) {
      productTypes.set(definition.name, definition);
    }
  }

  const productTypeSchemeId = await ensureSchemeWithValues(
    db,
    IDECO_SCHEME_CODES.productType,
    IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.productType],
    [...productTypes.values()],
  );
  if (!productTypeSchemeId) {
    return result;
  }

  await ensureSchemeWithValues(
    db,
    IDECO_SCHEME_CODES.majorCategory,
    IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.majorCategory],
    IDECO_MAJOR_CATEGORIES,
  );
  await ensureSchemeWithValues(
    db,
    IDECO_SCHEME_CODES.productStyle,
    IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.productStyle],
    IDECO_PRODUCT_STYLES,
  );
  await ensureSchemeWithValues(
    db,
    IDECO_SCHEME_CODES.instrumentStatus,
    IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.instrumentStatus],
    IDECO_INSTRUMENT_STATUSES,
  );
  await ensureSchemeWithValues(
    db,
    IDECO_SCHEME_CODES.region,
    IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.region],
    IDECO_REGIONS,
  );
  await ensureSchemeWithValues(
    db,
    IDECO_SCHEME_CODES.assetClass,
    IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.assetClass],
    IDECO_ASSET_CLASSES,
  );

  return result;
}

async function resolveInstrumentClassificationIds(
  db: AppDatabase,
  row: IdecoInstrumentCsvRow,
) {
  let result: string[] = [];

  const valueCodes: Array<{ schemeCode: string; valueCode: string }> = [
    {
      schemeCode: IDECO_SCHEME_CODES.majorCategory,
      valueCode: row.majorCategoryCode,
    },
    {
      schemeCode: IDECO_SCHEME_CODES.productType,
      valueCode: row.productTypeCode,
    },
  ];

  if (row.productStyleCode) {
    valueCodes.push({
      schemeCode: IDECO_SCHEME_CODES.productStyle,
      valueCode: row.productStyleCode,
    });
  }

  if (row.statusCode) {
    valueCodes.push({
      schemeCode: IDECO_SCHEME_CODES.instrumentStatus,
      valueCode: row.statusCode,
    });
  }

  const analysisTags = resolveIdecoAnalysisTags(row.productTypeCode);
  if (analysisTags) {
    valueCodes.push(
      {
        schemeCode: IDECO_SCHEME_CODES.region,
        valueCode: analysisTags.regionCode,
      },
      {
        schemeCode: IDECO_SCHEME_CODES.assetClass,
        valueCode: analysisTags.assetClassCode,
      },
    );
  }

  for (const entry of valueCodes) {
    const valueId = await ensureClassificationValueId(
      db,
      entry.schemeCode,
      entry.valueCode,
    );
    if (!valueId) {
      return [];
    }
    result.push(valueId);
  }

  return result;
}

async function importInstrumentsFromParsed(
  db: AppDatabase,
  rows: IdecoInstrumentCsvRow[],
  counters: { created: number; reused: number },
) {
  let result: Map<string, string> = new Map();

  for (const row of rows) {
    const existingBefore = await findInstrumentByName(db, row.instrumentName);
    const existing = await upsertInstrument(db, {
      name: row.instrumentName,
      instrumentType: row.majorCategoryCode === "time_deposit" ? "deposit" : "mutual_fund",
      currency: "JPY",
      externalId: String(row.catalogNumber),
    });

    if (!existing) {
      return result;
    }

    const prior = await findInstrumentByAttributeTextValue(
      db,
      IDECO_INSTRUMENT_ATTRIBUTE_CODES.shortName,
      row.shortName,
    );
    if (prior && prior.id !== existing.id) {
      return result;
    }

    if (existingBefore) {
      counters.reused += 1;
    } else {
      counters.created += 1;
    }

    await setInstrumentAttributes(
      db,
      existing.id,
      buildIdecoInstrumentAttributes({
        shortName: row.shortName,
        provider: row.provider,
        trustFeeText: row.trustFeeText,
        trustReserveText: row.trustReserveText,
      }),
    );

    const classificationValueIds = await resolveInstrumentClassificationIds(db, row);
    if (classificationValueIds.length === 0) {
      return result;
    }

    await setInstrumentClassifications(db, existing.id, classificationValueIds);
    result.set(row.shortName, existing.id);
  }

  return result;
}

async function importHoldingsFromParsed(
  db: AppDatabase,
  parsed: ParseIdecoHoldingsCsvResult,
) {
  let result: Awaited<ReturnType<typeof replaceCurrentSnapshot>> = null;

  const lines: Array<{
    instrumentId: string;
    sortOrder: number;
    quantity: number;
    marketValueMinor: number;
    bookValueMinor: number;
    metrics: ReturnType<typeof buildIdecoKakeiboMetrics>;
  }> = [];

  for (const row of parsed.rows) {
    const instrumentId = await resolveHoldingInstrumentId(db, row.instrumentName);
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

  result = await replaceCurrentSnapshot(db, {
    portfolioCode: IDECO_PORTFOLIO_CODE,
    asOfDate: parsed.asOfDate,
    lines,
  });
  return result;
}

export async function importIdecoData(
  db: AppDatabase,
  files: IdecoImportFiles,
): Promise<ImportIdecoDataResult | null> {
  let result: ImportIdecoDataResult | null = null;

  const productTypesParsed = parseIdecoProductTypesCsv(files.productTypesCsv);
  parseIdecoAnalysisCsv(files.analysisCsv);
  const instrumentsParsed = parseIdecoInstrumentsCsv(files.instrumentsCsv);
  const holdingsParsed = parseIdecoHoldingsCsv(files.holdingsCsv);

  await ensureIdecoPortfolio(db);

  const productTypeNames = [
    ...productTypesParsed.rows.map((row) => row.name),
    ...instrumentsParsed.rows.map((row) => row.productTypeName),
  ];
  await seedIdecoClassifications(db, productTypeNames);

  const counters = { created: 0, reused: 0 };
  const instrumentIdByShortName = await importInstrumentsFromParsed(
    db,
    instrumentsParsed.rows,
    counters,
  );
  if (instrumentIdByShortName.size !== instrumentsParsed.rows.length) {
    return result;
  }

  const snapshot = await importHoldingsFromParsed(db, holdingsParsed);
  if (!snapshot) {
    return result;
  }

  result = {
    asOfDate: holdingsParsed.asOfDate,
    lineCount: holdingsParsed.rows.length,
    instrumentCount: instrumentsParsed.rows.length,
    createdInstruments: counters.created,
    reusedInstruments: counters.reused,
  };
  return result;
}

export async function getIdecoCurrentSnapshot(db: AppDatabase) {
  let result = await getCurrentSnapshot(db, IDECO_PORTFOLIO_CODE);
  return result;
}
