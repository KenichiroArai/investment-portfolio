import {
  buildMonexAccountId,
  buildMonexAccountName,
  getMonexCsvCell,
  indexMonexHeaders,
  MonexCsvError,
  parseMonexCsv,
  parseMonexDate,
  parseMonexDecimalRate,
  parseMonexInteger,
  requireMonexHeader,
} from "./monex-csv-utils";

export type MonexDomesticHoldingsCsvRow = {
  asOfDate: string;
  instrumentName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  custodyType: string;
  unitPriceMinor: number;
  dividendOption: string;
  quantity: number;
  avgCostMinor: number;
  marketValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseMonexDomesticHoldingsCsvResult = {
  rows: MonexDomesticHoldingsCsvRow[];
};

export function parseMonexDomesticHoldingsCsv(
  content: string,
): ParseMonexDomesticHoldingsCsvResult {
  let result: ParseMonexDomesticHoldingsCsvResult = { rows: [] };

  const table = parseMonexCsv(content);
  if (table.length < 2) {
    return result;
  }

  const headerIndex = indexMonexHeaders(table[0]);
  const dateIndex = requireMonexHeader(headerIndex, "日付");
  const nameIndex = requireMonexHeader(headerIndex, "銘柄");
  const accountTypeIndex = requireMonexHeader(headerIndex, "口座区分");
  const custodyTypeIndex = requireMonexHeader(headerIndex, "預り区分");
  const unitPriceIndex = requireMonexHeader(headerIndex, "基準価額(円)");
  const dividendIndex = requireMonexHeader(headerIndex, "分配金の取扱い");
  const quantityIndex = requireMonexHeader(headerIndex, "保有数(口)");
  const avgCostIndex = requireMonexHeader(headerIndex, "平均取得単価(円)");
  const marketValueIndex = requireMonexHeader(headerIndex, "概算評価額(円)");
  const gainIndex = requireMonexHeader(headerIndex, "評価損益(円)");
  const gainRateIndex = requireMonexHeader(headerIndex, "評価損益率");

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex];
    const instrumentName = getMonexCsvCell(cells, nameIndex);
    if (instrumentName === "") {
      continue;
    }

    const asOfDate = parseMonexDate(getMonexCsvCell(cells, dateIndex));
    if (asOfDate === "") {
      throw new MonexCsvError(`日付の形式が不正です: ${getMonexCsvCell(cells, dateIndex)}`);
    }

    let row: MonexDomesticHoldingsCsvRow = {
      accountId: buildMonexAccountId(
        getMonexCsvCell(cells, accountTypeIndex),
        getMonexCsvCell(cells, custodyTypeIndex),
      ),
      accountName: buildMonexAccountName(
        getMonexCsvCell(cells, accountTypeIndex),
        getMonexCsvCell(cells, custodyTypeIndex),
      ),
      asOfDate,
      instrumentName,
      accountType: getMonexCsvCell(cells, accountTypeIndex),
      custodyType: getMonexCsvCell(cells, custodyTypeIndex),
      unitPriceMinor: parseMonexInteger(getMonexCsvCell(cells, unitPriceIndex)),
      dividendOption: getMonexCsvCell(cells, dividendIndex),
      quantity: parseMonexInteger(getMonexCsvCell(cells, quantityIndex)),
      avgCostMinor: parseMonexInteger(getMonexCsvCell(cells, avgCostIndex)),
      marketValueMinor: parseMonexInteger(getMonexCsvCell(cells, marketValueIndex)),
      unrealizedGainMinor: parseMonexInteger(getMonexCsvCell(cells, gainIndex)),
      unrealizedGainRate: parseMonexDecimalRate(getMonexCsvCell(cells, gainRateIndex)),
    };
    result.rows.push(row);
  }

  return result;
}
