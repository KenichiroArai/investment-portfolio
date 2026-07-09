import {
  buildMonexAccountId,
  buildMonexAccountName,
  indexMonexHeaders,
  MonexCsvError,
  parseMonexCsv,
  parseMonexDate,
  parseMonexInteger,
  requireMonexHeader,
} from "./monex-csv-utils";

export type MonexCompassFundCsvRow = {
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

export type ParseMonexCompassFundCsvResult = {
  rows: MonexCompassFundCsvRow[];
};

export function parseMonexCompassFundCsv(
  content: string,
): ParseMonexCompassFundCsvResult {
  let result: ParseMonexCompassFundCsvResult = { rows: [] };

  const table = parseMonexCsv(content);
  if (table.length < 2) {
    return result;
  }

  const headerIndex = indexMonexHeaders(table[0]);
  const dateIndex = requireMonexHeader(headerIndex, "日付");
  const nameIndex = requireMonexHeader(headerIndex, "ファンド名");
  const accountTypeIndex = requireMonexHeader(headerIndex, "口座区分");
  const custodyTypeIndex = requireMonexHeader(headerIndex, "預り区分");
  const unitPriceIndex = requireMonexHeader(headerIndex, "基準価額(円)");
  const dividendIndex = requireMonexHeader(headerIndex, "分配金");
  const quantityIndex = requireMonexHeader(headerIndex, "保有数(口)");
  const avgCostIndex = requireMonexHeader(headerIndex, "平均取得単価(円)");
  const marketValueIndex = requireMonexHeader(headerIndex, "概算評価額(円)");
  const gainIndex = requireMonexHeader(headerIndex, "概算評価損益(円)");

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex];
    const instrumentName = cells[nameIndex]?.trim() ?? "";
    if (instrumentName === "") {
      continue;
    }

    const asOfDate = parseMonexDate(cells[dateIndex] ?? "");
    if (asOfDate === "") {
      throw new MonexCsvError(`日付の形式が不正です: ${cells[dateIndex] ?? ""}`);
    }

    const quantity = parseMonexInteger(cells[quantityIndex] ?? "");
    const marketValueMinor = parseMonexInteger(cells[marketValueIndex] ?? "");
    const avgCostMinor = parseMonexInteger(cells[avgCostIndex] ?? "");
    const unrealizedGainMinor = parseMonexInteger(cells[gainIndex] ?? "");
    const bookValueMinor = avgCostMinor * quantity;
    let unrealizedGainRate = 0;
    if (bookValueMinor > 0 && Number.isFinite(unrealizedGainMinor)) {
      unrealizedGainRate = unrealizedGainMinor / bookValueMinor;
    }

    let row: MonexCompassFundCsvRow = {
      asOfDate,
      instrumentName,
      accountId: buildMonexAccountId(
        cells[accountTypeIndex]?.trim() ?? "",
        cells[custodyTypeIndex]?.trim() ?? "",
      ),
      accountName: buildMonexAccountName(
        cells[accountTypeIndex]?.trim() ?? "",
        cells[custodyTypeIndex]?.trim() ?? "",
      ),
      accountType: cells[accountTypeIndex]?.trim() ?? "",
      custodyType: cells[custodyTypeIndex]?.trim() ?? "",
      unitPriceMinor: parseMonexInteger(cells[unitPriceIndex] ?? ""),
      dividendOption: cells[dividendIndex]?.trim() ?? "",
      quantity,
      avgCostMinor,
      marketValueMinor,
      unrealizedGainMinor,
      unrealizedGainRate,
    };
    result.rows.push(row);
  }

  return result;
}
