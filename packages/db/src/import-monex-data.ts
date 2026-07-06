import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  MONEX_ASSET_CLASS_CSV_FILES,
  MONEX_ASSET_CLASS_FILE_MAP,
  MONEX_INSTRUMENT_ATTRIBUTE_CODES,
  MONEX_SCHEME_CODES,
  buildMonexAssetClassNameMap,
  buildMonexHoldingMetrics,
  matchMonexInstrumentId,
  parseMonexCompassFundCsv,
  parseMonexDomesticHoldingsCsv,
  parseMonexUsStocksCsv,
  type MonexInstrumentMatchCandidate,
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
  listInstruments,
  setInstrumentAttributes,
  type InstrumentAttributeInput,
} from "./repositories/instruments";
import { createPortfolio, findPortfolioByCode } from "./repositories/portfolios";
import {
  upsertSnapshotByDate,
  type HoldingLineInput,
} from "./repositories/snapshots";
import { readCsvText } from "./read-csv-text";

const MONEX_PORTFOLIO_CODE = "monex";
const DOMESTIC_HOLDINGS_FILE = "国内株等.csv";
const US_STOCKS_FILE = "米国株.csv";
const COMPASS_FUND_FILE = "ON COMPASS.csv";

export type ImportMonexDataResult = {
  asOfDate: string;
  lineCount: number;
  instrumentCount: number;
  createdInstruments: number;
};

export type MonexImportDirectory = {
  directory: string;
};

async function ensureMonexPortfolio(db: AppDatabase) {
  let result = await findPortfolioByCode(db, MONEX_PORTFOLIO_CODE);

  if (result) {
    return result;
  }

  result = await createPortfolio(db, {
    code: MONEX_PORTFOLIO_CODE,
    name: "マネックス証券",
    kind: "monex",
  });
  return result;
}

async function ensureMonexAssetClassScheme(db: AppDatabase) {
  let result = await findSchemeByPortfolioCodeAndSchemeCode(
    db,
    MONEX_PORTFOLIO_CODE,
    MONEX_SCHEME_CODES.assetClass,
  );

  if (result) {
    return result;
  }

  result = await createClassificationScheme(db, {
    portfolioCode: MONEX_PORTFOLIO_CODE,
    code: MONEX_SCHEME_CODES.assetClass,
    name: "資産クラス",
  });
  return result;
}

async function syncMonexAssetClassValues(db: AppDatabase, schemeId: string) {
  let result: void = undefined;

  let sortOrder = 0;
  for (const fileName of MONEX_ASSET_CLASS_CSV_FILES) {
    const assetClass = MONEX_ASSET_CLASS_FILE_MAP[fileName];
    if (!assetClass) {
      continue;
    }

    const existing = await findClassificationValueBySchemeAndCode(
      db,
      schemeId,
      assetClass.code,
    );
    if (existing) {
      continue;
    }

    await createClassificationValue(db, {
      schemeId,
      code: assetClass.code,
      name: assetClass.name,
      sortOrder,
    });
    sortOrder += 1;
  }

  return result;
}

async function resolveInstrumentId(
  db: AppDatabase,
  candidates: MonexInstrumentMatchCandidate[],
  instrumentName: string,
  params: {
    instrumentType: string;
    currency: string;
    externalId?: string | null;
    attributes?: InstrumentAttributeInput[];
    classificationValueId?: string | null;
  },
): Promise<{ instrumentId: string; created: boolean }> {
  let result = { instrumentId: "", created: false };

  const matchedId = matchMonexInstrumentId(candidates, instrumentName);
  if (matchedId) {
    result.instrumentId = matchedId;
    if (params.classificationValueId) {
      await setInstrumentClassifications(db, matchedId, [params.classificationValueId]);
    }
    return result;
  }

  const instrument = await createInstrument(db, {
    name: instrumentName,
    instrumentType: params.instrumentType,
    currency: params.currency,
    externalId: params.externalId ?? null,
  });

  if (params.attributes && params.attributes.length > 0) {
    await setInstrumentAttributes(db, instrument.id, params.attributes);
  }

  if (params.classificationValueId) {
    await setInstrumentClassifications(db, instrument.id, [
      params.classificationValueId,
    ]);
  }

  candidates.push({ id: instrument.id, name: instrument.name });
  result = { instrumentId: instrument.id, created: true };
  return result;
}

async function resolveClassificationValueId(
  db: AppDatabase,
  schemeId: string,
  assetClassCode: string | undefined,
): Promise<string | null> {
  let result: string | null = null;

  if (!assetClassCode) {
    return result;
  }

  const value = await findClassificationValueBySchemeAndCode(
    db,
    schemeId,
    assetClassCode,
  );
  if (!value) {
    return result;
  }

  result = value.id;
  return result;
}

function readMonexCsvFile(directory: string, fileName: string): string | null {
  let result: string | null = null;
  const filePath = join(directory, fileName);

  if (!existsSync(filePath)) {
    return result;
  }

  result = readCsvText(filePath, { encoding: "shift_jis" });
  return result;
}

function loadAssetClassEntries(directory: string) {
  let result: Array<{ fileName: string; content: string }> = [];

  for (const fileName of MONEX_ASSET_CLASS_CSV_FILES) {
    const content = readMonexCsvFile(directory, fileName);
    if (!content) {
      continue;
    }
    result.push({ fileName, content });
  }

  return result;
}

export async function importMonexData(
  db: AppDatabase,
  params: MonexImportDirectory,
): Promise<ImportMonexDataResult> {
  let result: ImportMonexDataResult = {
    asOfDate: "",
    lineCount: 0,
    instrumentCount: 0,
    createdInstruments: 0,
  };

  const directory = params.directory;
  if (!existsSync(directory)) {
    throw new Error(`ディレクトリが見つかりません: ${directory}`);
  }

  await ensureMonexPortfolio(db);
  const scheme = await ensureMonexAssetClassScheme(db);
  if (!scheme) {
    throw new Error("資産クラス分類体系の作成に失敗しました。");
  }
  await syncMonexAssetClassValues(db, scheme.id);

  const assetClassNameMap = buildMonexAssetClassNameMap(
    loadAssetClassEntries(directory),
    MONEX_ASSET_CLASS_FILE_MAP,
  );

  const domesticContent = readMonexCsvFile(directory, DOMESTIC_HOLDINGS_FILE);
  const usStocksContent = readMonexCsvFile(directory, US_STOCKS_FILE);
  const compassContent = readMonexCsvFile(directory, COMPASS_FUND_FILE);

  const domesticRows = domesticContent
    ? parseMonexDomesticHoldingsCsv(domesticContent).rows
    : [];
  const usStockRows = usStocksContent
    ? parseMonexUsStocksCsv(usStocksContent).rows
    : [];
  const compassRows = compassContent
    ? parseMonexCompassFundCsv(compassContent).rows
    : [];

  const asOfDates = [
    ...domesticRows.map((row) => row.asOfDate),
    ...usStockRows.map((row) => row.asOfDate),
    ...compassRows.map((row) => row.asOfDate),
  ].sort();
  if (asOfDates.length === 0) {
    throw new Error("取り込み対象の明細がありません。");
  }

  const asOfDate = asOfDates[asOfDates.length - 1];
  result.asOfDate = asOfDate;

  const existingInstruments = await listInstruments(db);
  const candidates: MonexInstrumentMatchCandidate[] = existingInstruments.map(
    (instrument) => ({
      id: instrument.id,
      name: instrument.name,
    }),
  );

  const lines: HoldingLineInput[] = [];
  let sortOrder = 1;

  for (const row of domesticRows) {
    const assetClassCode = assetClassNameMap.get(row.instrumentName);
    const classificationValueId = await resolveClassificationValueId(
      db,
      scheme.id,
      assetClassCode,
    );
    const resolved = await resolveInstrumentId(db, candidates, row.instrumentName, {
      instrumentType: "mutual_fund",
      currency: "JPY",
      classificationValueId,
    });
    if (resolved.created) {
      result.createdInstruments += 1;
    }

    const bookValueMinor = row.avgCostMinor * row.quantity;
    let line: HoldingLineInput = {
      instrumentId: resolved.instrumentId,
      quantity: row.quantity,
      marketValueMinor: row.marketValueMinor,
      bookValueMinor,
      sortOrder,
      metrics: buildMonexHoldingMetrics({
        unitPriceMinor: row.unitPriceMinor,
        avgCostMinor: row.avgCostMinor,
        accountType: row.accountType,
        custodyType: row.custodyType,
        dividendOption: row.dividendOption,
        unrealizedGainMinor: row.unrealizedGainMinor,
        unrealizedGainRate: row.unrealizedGainRate,
      }),
    };
    lines.push(line);
    sortOrder += 1;
  }

  for (const row of usStockRows) {
    const assetClassCode = assetClassNameMap.get(row.instrumentName);
    const classificationValueId = await resolveClassificationValueId(
      db,
      scheme.id,
      assetClassCode,
    );
    const attributes: InstrumentAttributeInput[] = [
      {
        code: MONEX_INSTRUMENT_ATTRIBUTE_CODES.market,
        textValue: row.market,
      },
      {
        code: MONEX_INSTRUMENT_ATTRIBUTE_CODES.ticker,
        textValue: row.ticker,
      },
    ];
    const resolved = await resolveInstrumentId(db, candidates, row.instrumentName, {
      instrumentType: "equity",
      currency: "USD",
      externalId: row.ticker,
      attributes,
      classificationValueId,
    });
    if (resolved.created) {
      result.createdInstruments += 1;
    }

    const bookValueMinor = row.avgCostMinor * row.quantity;
    let line: HoldingLineInput = {
      instrumentId: resolved.instrumentId,
      quantity: row.quantity,
      marketValueMinor: row.marketValueMinor,
      bookValueMinor,
      sortOrder,
      metrics: buildMonexHoldingMetrics({
        unitPriceMinor: row.avgCostMinor,
        avgCostMinor: row.avgCostMinor,
        accountType: row.accountType,
        custodyType: row.custodyType,
        dividendOption: "",
        unrealizedGainMinor: row.unrealizedGainMinor,
        unrealizedGainRate: row.unrealizedGainRate,
      }),
    };
    lines.push(line);
    sortOrder += 1;
  }

  for (const row of compassRows) {
    const assetClassCode = assetClassNameMap.get(row.instrumentName);
    const classificationValueId = await resolveClassificationValueId(
      db,
      scheme.id,
      assetClassCode,
    );
    const resolved = await resolveInstrumentId(db, candidates, row.instrumentName, {
      instrumentType: "mutual_fund",
      currency: "JPY",
      classificationValueId,
    });
    if (resolved.created) {
      result.createdInstruments += 1;
    }

    const bookValueMinor = row.avgCostMinor * row.quantity;
    let line: HoldingLineInput = {
      instrumentId: resolved.instrumentId,
      quantity: row.quantity,
      marketValueMinor: row.marketValueMinor,
      bookValueMinor,
      sortOrder,
      metrics: buildMonexHoldingMetrics({
        unitPriceMinor: row.unitPriceMinor,
        avgCostMinor: row.avgCostMinor,
        accountType: row.accountType,
        custodyType: row.custodyType,
        dividendOption: row.dividendOption,
        unrealizedGainMinor: row.unrealizedGainMinor,
        unrealizedGainRate: row.unrealizedGainRate,
      }),
    };
    lines.push(line);
    sortOrder += 1;
  }

  await upsertSnapshotByDate(db, {
    portfolioCode: MONEX_PORTFOLIO_CODE,
    asOfDate,
    lines,
    setAsCurrent: true,
    allowDuplicateInstrumentIds: true,
  });

  result.lineCount = lines.length;
  result.instrumentCount = candidates.length;
  return result;
}

export function listMonexImportCsvFiles(directory: string): string[] {
  let result: string[] = [];

  if (!existsSync(directory)) {
    return result;
  }

  result = readdirSync(directory).filter((fileName) => fileName.endsWith(".csv"));
  return result;
}
