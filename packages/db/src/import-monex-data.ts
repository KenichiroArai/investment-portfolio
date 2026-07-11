import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  MONEX_ASSET_CLASS_CSV_FILES,
  MONEX_ASSET_CLASS_FILE_MAP,
  MONEX_INSTRUMENT_ATTRIBUTE_CODES,
  MONEX_SCHEME_CODES,
  buildMonexAssetClassNameMap,
  buildMonexHoldingMetrics,
  buildMonexInstrumentAssetClassBreakdown,
  computeMonexMutualFundBookValueMinor,
  indexMonexHeaders,
  getMonexCsvCell,
  matchMonexInstrumentId,
  parseMonexCsv,
  parseMonexCompassFundCsv,
  parseMonexDomesticHoldingsCsv,
  parseMonexUsStocksCsv,
  requireMonexHeader,
  resolveMonexInstrumentAssetClassBreakdown,
  type MonexInstrumentAssetClassBreakdownEntry,
  type MonexInstrumentMatchCandidate,
} from "@repo/shared";

import type { AppDatabase } from "./client";
import {
  createClassificationScheme,
  createClassificationValue,
  findClassificationValueBySchemeAndCode,
  findSchemeByPortfolioCodeAndSchemeCode,
  setInstrumentClassificationsWithWeights,
} from "./repositories/classifications";
import {
  listInstruments,
  setInstrumentAttributes,
  upsertInstrument,
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
const INSTRUMENT_MAPPING_FILE = "銘柄マッピング.csv";

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
    /* v8 ignore start */
    if (!assetClass) {
      continue;
    }
    /* v8 ignore stop */

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
    additionalMatchNames: string[];
  },
): Promise<{ instrumentId: string; created: boolean }> {
  let result = { instrumentId: "", created: false };

  const matchedId = matchMonexInstrumentId(
    candidates,
    instrumentName,
    params.additionalMatchNames,
  );
  if (matchedId) {
    result.instrumentId = matchedId;
    return result;
  }

  const instrument = await upsertInstrument(db, {
    portfolioCode: MONEX_PORTFOLIO_CODE,
    accountId: `${MONEX_PORTFOLIO_CODE}:unknown`,
    name: instrumentName,
    instrumentType: params.instrumentType,
    currency: params.currency,
    externalId: params.externalId ?? null,
  });
  /* v8 ignore start */
  if (!instrument) {
    throw new Error(
      `銘柄の作成に失敗しました: ${MONEX_PORTFOLIO_CODE} / ${instrumentName}`,
    );
  }
  /* v8 ignore stop */

  const alreadyListed = candidates.some((candidate) => candidate.id === instrument.id);
  if (params.attributes && params.attributes.length > 0) {
    await setInstrumentAttributes(db, instrument.id, params.attributes);
  }

  /* v8 ignore start */
  if (alreadyListed) {
    result = { instrumentId: instrument.id, created: false };
    return result;
  }
  /* v8 ignore stop */

  candidates.push({ id: instrument.id, name: instrument.name });
  result = { instrumentId: instrument.id, created: true };
  return result;
}

async function applyInstrumentAssetClassTags(
  db: AppDatabase,
  schemeId: string,
  instrumentId: string,
  instrumentName: string,
  additionalMatchNames: string[],
  breakdownMap: Map<string, MonexInstrumentAssetClassBreakdownEntry[]>,
  fallbackNameMap: Map<string, string>,
): Promise<void> {
  let result: void = undefined;

  const breakdown = resolveMonexInstrumentAssetClassBreakdown(
    breakdownMap,
    instrumentName,
    additionalMatchNames,
  );

  if (breakdown.length > 0) {
    const weights: Array<{
      classificationValueId: string;
      allocationWeight: number;
    }> = [];

    for (const entry of breakdown) {
      const classificationValueId = await resolveClassificationValueId(
        db,
        schemeId,
        entry.valueCode,
      );
      if (!classificationValueId) {
        /* v8 ignore next */
        continue;
      }
      weights.push({
        classificationValueId,
        allocationWeight: entry.allocationWeight,
      });
    }

    if (weights.length > 0) {
      await setInstrumentClassificationsWithWeights(db, instrumentId, weights);
      return result;
    }
  }

  const fallbackCode = resolveAssetClassCode(
    fallbackNameMap,
    instrumentName,
    additionalMatchNames,
  );
  const fallbackValueId = await resolveClassificationValueId(
    db,
    schemeId,
    fallbackCode,
  );
  if (!fallbackValueId) {
    /* v8 ignore next */
    return result;
  }

  await setInstrumentClassificationsWithWeights(db, instrumentId, [
    {
      classificationValueId: fallbackValueId,
      allocationWeight: 1,
    },
  ]);
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
    /* v8 ignore next */
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

function loadInstrumentAliasMap(directory: string): Map<string, string[]> {
  let result = new Map<string, string[]>();

  const mappingContent = readMonexCsvFile(directory, INSTRUMENT_MAPPING_FILE);
  if (!mappingContent) {
    return result;
  }

  const table = parseMonexCsv(mappingContent);
  if (table.length < 2) {
    /* v8 ignore next */
    return result;
  }

  const headerIndex = indexMonexHeaders(table[0]);
  const value1Index = requireMonexHeader(headerIndex, "対応値1");
  const value2Index = requireMonexHeader(headerIndex, "対応値2");

  const addAlias = (source: string, alias: string): void => {
    let addAliasResult: void = undefined;
    const current = result.get(source) ?? [];
    if (!current.includes(alias)) {
      current.push(alias);
      result.set(source, current);
    }
    return addAliasResult;
  };

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex];
    const value1 = getMonexCsvCell(cells, value1Index);
    const value2 = getMonexCsvCell(cells, value2Index);
    if (value1 === "" || value2 === "") {
      continue;
    }
    if (value1 === value2) {
      continue;
    }

    addAlias(value1, value2);
    addAlias(value2, value1);
  }

  return result;
}

function resolveAssetClassCode(
  assetClassNameMap: Map<string, string>,
  instrumentName: string,
  additionalMatchNames: string[],
): string | undefined {
  let result = assetClassNameMap.get(instrumentName);
  if (result) {
    return result;
  }

  for (const aliasName of additionalMatchNames) {
    result = assetClassNameMap.get(aliasName);
    if (result) {
      return result;
    }
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
  /* v8 ignore start */
  if (!scheme) {
    throw new Error("資産クラス分類体系の作成に失敗しました。");
  }
  /* v8 ignore stop */
  await syncMonexAssetClassValues(db, scheme.id);

  const instrumentAliasMap = loadInstrumentAliasMap(directory);
  const assetClassEntries = loadAssetClassEntries(directory);
  const assetClassBreakdownMap = buildMonexInstrumentAssetClassBreakdown(
    assetClassEntries,
    MONEX_ASSET_CLASS_FILE_MAP,
    instrumentAliasMap,
  );
  const assetClassNameMap = buildMonexAssetClassNameMap(
    assetClassEntries,
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

  const existingInstruments = await listInstruments(db, {
    portfolioCode: MONEX_PORTFOLIO_CODE,
  });
  const candidates: MonexInstrumentMatchCandidate[] = existingInstruments.map(
    (instrument) => ({
      id: instrument.id,
      name: instrument.name,
    }),
  );

  const lines: HoldingLineInput[] = [];
  let sortOrder = 1;

  for (const row of domesticRows) {
    const additionalMatchNames = instrumentAliasMap.get(row.instrumentName) ?? [];
    const resolved = await resolveInstrumentId(
      db,
      candidates,
      row.instrumentName,
      {
      instrumentType: "mutual_fund",
      currency: "JPY",
      additionalMatchNames,
      },
    );
    if (resolved.created) {
      result.createdInstruments += 1;
    }
    await applyInstrumentAssetClassTags(
      db,
      scheme.id,
      resolved.instrumentId,
      row.instrumentName,
      additionalMatchNames,
      assetClassBreakdownMap,
      assetClassNameMap,
    );

    const bookValueMinor = computeMonexMutualFundBookValueMinor(
      row.avgCostMinor,
      row.quantity,
    );
    let line: HoldingLineInput = {
      instrumentId: resolved.instrumentId,
      accountId: row.accountId,
      accountName: row.accountName,
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
    const additionalMatchNames = instrumentAliasMap.get(row.instrumentName) ?? [];
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
    const resolved = await resolveInstrumentId(
      db,
      candidates,
      row.instrumentName,
      {
        instrumentType: "equity",
        currency: "USD",
        externalId: row.ticker,
        attributes,
        additionalMatchNames,
      },
    );
    if (resolved.created) {
      result.createdInstruments += 1;
    }
    await applyInstrumentAssetClassTags(
      db,
      scheme.id,
      resolved.instrumentId,
      row.instrumentName,
      additionalMatchNames,
      assetClassBreakdownMap,
      assetClassNameMap,
    );

    const bookValueMinor = row.avgCostMinor * row.quantity;
    let line: HoldingLineInput = {
      instrumentId: resolved.instrumentId,
      accountId: row.accountId,
      accountName: row.accountName,
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
    const additionalMatchNames = instrumentAliasMap.get(row.instrumentName) ?? [];
    const resolved = await resolveInstrumentId(
      db,
      candidates,
      row.instrumentName,
      {
      instrumentType: "mutual_fund",
      currency: "JPY",
      additionalMatchNames,
      },
    );
    if (resolved.created) {
      result.createdInstruments += 1;
    }
    await applyInstrumentAssetClassTags(
      db,
      scheme.id,
      resolved.instrumentId,
      row.instrumentName,
      additionalMatchNames,
      assetClassBreakdownMap,
      assetClassNameMap,
    );

    const bookValueMinor = computeMonexMutualFundBookValueMinor(
      row.avgCostMinor,
      row.quantity,
    );
    let line: HoldingLineInput = {
      instrumentId: resolved.instrumentId,
      accountId: row.accountId,
      accountName: row.accountName,
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
