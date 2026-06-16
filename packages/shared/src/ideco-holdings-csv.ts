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

export type IdecoHoldingsCsvSnapshotGroup = {
  asOfDate: string;
  rows: IdecoHoldingsCsvRow[];
};

export type ParseIdecoHoldingsCsvByDateResult = {
  snapshots: IdecoHoldingsCsvSnapshotGroup[];
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

function assertUniqueHoldingsInstrumentNames(
  asOfDate: string,
  rows: IdecoHoldingsCsvRow[],
): void {
  let result: void = undefined;
  const seen = new Map<string, number>();

  for (const row of rows) {
    const existingLineNumber = seen.get(row.instrumentName);
    if (existingLineNumber !== undefined) {
      throw new IdecoCsvError(
        `明細 CSV の基準日 ${asOfDate} で運用商品名「${row.instrumentName}」が重複しています（${existingLineNumber} 行目と ${row.rowNumber} 行目）`,
      );
    }
    seen.set(row.instrumentName, row.rowNumber);
  }

  return result;
}

export function parseIdecoHoldingsCsvByDate(
  content: string,
): ParseIdecoHoldingsCsvByDateResult {
  let result: ParseIdecoHoldingsCsvByDateResult = { snapshots: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("明細 CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("明細 CSV にデータ行がありません");
  }

  assertHoldingsHeader(records[0]);

  const groups = new Map<string, IdecoHoldingsCsvRow[]>();

  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    const row = parseHoldingsDataRow(records[index], lineNumber);
    const existing = groups.get(row.asOfDate) ?? [];
    existing.push(row);
    groups.set(row.asOfDate, existing);
  }

  const snapshots = [...groups.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([asOfDate, rows]) => {
      assertUniqueHoldingsInstrumentNames(asOfDate, rows);
      let group: IdecoHoldingsCsvSnapshotGroup = { asOfDate, rows };
      return group;
    });

  result = { snapshots };
  return result;
}

export function parseIdecoHoldingsCsv(content: string): ParseIdecoHoldingsCsvResult {
  let result: ParseIdecoHoldingsCsvResult = { asOfDate: "", rows: [] };

  const parsed = parseIdecoHoldingsCsvByDate(content);
  if (parsed.snapshots.length > 1) {
    throw new IdecoCsvError(
      "明細 CSV に複数の基準日が含まれています。日付ごとにファイルを分けるか parseIdecoHoldingsCsvByDate を利用してください",
    );
  }

  result = {
    asOfDate: parsed.snapshots[0].asOfDate,
    rows: parsed.snapshots[0].rows,
  };
  return result;
}
