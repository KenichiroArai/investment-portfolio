import {
  IdecoCsvError,
  parseCsvRecords,
  parseGainRate,
  parseIdecoDate,
  parseJapaneseInteger,
  stripUtf8Bom,
} from "./ideco-csv-utils";

export const IDECO_HOLDINGS_CSV_HEADERS = [
  "番号",
  "日付",
  "運用商品名",
  "時価単価(1万口当り)",
  "残高数量",
  "資産残高",
  "購入金額",
  "損益",
  "損益率",
] as const;

export type IdecoHoldingsCsvRow = {
  rowNumber: number;
  asOfDate: string;
  instrumentName: string;
  unitPricePerTenThousandLots: number;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseIdecoHoldingsCsvResult = {
  asOfDate: string;
  rows: IdecoHoldingsCsvRow[];
};

function assertHoldingsHeader(headerRow: string[]): void {
  let result: void = undefined;

  if (headerRow.length !== IDECO_HOLDINGS_CSV_HEADERS.length) {
    throw new IdecoCsvError(
      `明細 CSV ヘッダー列数が不正です（期待: ${IDECO_HOLDINGS_CSV_HEADERS.length}）`,
    );
  }

  for (let index = 0; index < IDECO_HOLDINGS_CSV_HEADERS.length; index += 1) {
    const expected = IDECO_HOLDINGS_CSV_HEADERS[index];
    const actual = headerRow[index].trim();
    if (actual !== expected) {
      throw new IdecoCsvError(
        `明細 CSV ヘッダーが不正です（列 ${index + 1}: 期待「${expected}」、実際「${actual}」）`,
      );
    }
  }

  return result;
}

function parseHoldingsDataRow(
  cells: string[],
  lineNumber: number,
): IdecoHoldingsCsvRow {
  let result: IdecoHoldingsCsvRow = {
    rowNumber: 0,
    asOfDate: "",
    instrumentName: "",
    unitPricePerTenThousandLots: 0,
    quantity: 0,
    marketValueMinor: 0,
    bookValueMinor: 0,
    unrealizedGainMinor: 0,
    unrealizedGainRate: 0,
  };

  if (cells.length !== IDECO_HOLDINGS_CSV_HEADERS.length) {
    throw new IdecoCsvError(
      `${lineNumber} 行目の列数が不正です（期待: ${IDECO_HOLDINGS_CSV_HEADERS.length}）`,
    );
  }

  const rowNumber = parseJapaneseInteger(cells[0]);
  if (!Number.isFinite(rowNumber) || rowNumber <= 0) {
    throw new IdecoCsvError(`${lineNumber} 行目の番号が不正です`);
  }

  const asOfDate = parseIdecoDate(cells[1]);
  const instrumentName = cells[2].trim();
  if (instrumentName === "") {
    throw new IdecoCsvError(`${lineNumber} 行目の運用商品名が空です`);
  }

  const unitPricePerTenThousandLots = parseJapaneseInteger(cells[3]);
  const quantity = parseJapaneseInteger(cells[4]);
  const marketValueYen = parseJapaneseInteger(cells[5]);
  const bookValueYen = parseJapaneseInteger(cells[6]);
  const unrealizedGainYen = parseJapaneseInteger(cells[7]);
  const unrealizedGainRate = parseGainRate(cells[8]);

  if (
    !Number.isFinite(unitPricePerTenThousandLots) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(marketValueYen) ||
    !Number.isFinite(bookValueYen) ||
    !Number.isFinite(unrealizedGainYen) ||
    !Number.isFinite(unrealizedGainRate)
  ) {
    throw new IdecoCsvError(`${lineNumber} 行目の数値が不正です`);
  }

  if (quantity <= 0) {
    throw new IdecoCsvError(`${lineNumber} 行目の残高数量が不正です`);
  }

  result = {
    rowNumber,
    asOfDate,
    instrumentName,
    unitPricePerTenThousandLots,
    quantity,
    marketValueMinor: marketValueYen,
    bookValueMinor: bookValueYen,
    unrealizedGainMinor: unrealizedGainYen,
    unrealizedGainRate,
  };
  return result;
}

export function parseIdecoHoldingsCsv(content: string): ParseIdecoHoldingsCsvResult {
  let result: ParseIdecoHoldingsCsvResult = { asOfDate: "", rows: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("明細 CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("明細 CSV にデータ行がありません");
  }

  assertHoldingsHeader(records[0]);

  const rows: IdecoHoldingsCsvRow[] = [];
  let asOfDate = "";

  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    const row = parseHoldingsDataRow(records[index], lineNumber);
    if (asOfDate === "") {
      asOfDate = row.asOfDate;
    }
    if (row.asOfDate !== asOfDate) {
      throw new IdecoCsvError(
        `${lineNumber} 行目の日付が他行と一致しません（期待: ${asOfDate}、実際: ${row.asOfDate}）`,
      );
    }
    rows.push(row);
  }

  result = {
    asOfDate,
    rows,
  };
  return result;
}
