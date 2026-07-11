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

export type MonexUsStockCsvRow = {
  asOfDate: string;
  ticker: string;
  instrumentName: string;
  market: string;
  accountId: string;
  accountName: string;
  accountType: string;
  custodyType: string;
  quantity: number;
  avgCostMinor: number;
  marketValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseMonexUsStocksCsvResult = {
  rows: MonexUsStockCsvRow[];
};

export function parseMonexUsStocksCsv(content: string): ParseMonexUsStocksCsvResult {
  let result: ParseMonexUsStocksCsvResult = { rows: [] };

  const table = parseMonexCsv(content);
  if (table.length < 2) {
    return result;
  }

  const headerIndex = indexMonexHeaders(table[0]);
  const dateIndex = requireMonexHeader(headerIndex, "日付");
  const tickerIndex = requireMonexHeader(headerIndex, "ティッカー");
  const nameIndex = requireMonexHeader(headerIndex, "銘柄名");
  const marketIndex = requireMonexHeader(headerIndex, "市場");
  const accountTypeIndex = requireMonexHeader(headerIndex, "口座区分");
  const custodyTypeIndex = requireMonexHeader(headerIndex, "預り区分");
  const quantityIndex = requireMonexHeader(headerIndex, "保有株数");
  const avgCostIndex = requireMonexHeader(headerIndex, "概算簿価単価(円)");
  const marketValueIndex = requireMonexHeader(headerIndex, "概算評価額(円)");
  const gainIndex = requireMonexHeader(headerIndex, "概算評価損益(円)");
  const gainRateIndex = requireMonexHeader(headerIndex, "概算評価損益率(円)");

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

    let row: MonexUsStockCsvRow = {
      asOfDate,
      ticker: getMonexCsvCell(cells, tickerIndex),
      instrumentName,
      market: getMonexCsvCell(cells, marketIndex),
      accountId: buildMonexAccountId(
        getMonexCsvCell(cells, accountTypeIndex),
        getMonexCsvCell(cells, custodyTypeIndex),
      ),
      accountName: buildMonexAccountName(
        getMonexCsvCell(cells, accountTypeIndex),
        getMonexCsvCell(cells, custodyTypeIndex),
      ),
      accountType: getMonexCsvCell(cells, accountTypeIndex),
      custodyType: getMonexCsvCell(cells, custodyTypeIndex),
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
