import {
  resolveIdecoInstrumentStatus,
  resolveIdecoMajorCategory,
  resolveIdecoProductStyle,
  resolveIdecoProductType,
} from "./ideco-analysis";
import {
  IdecoCsvError,
  parseCsvRecords,
  parseJapaneseInteger,
  stripUtf8Bom,
} from "./ideco-csv-utils";

export const IDECO_INSTRUMENTS_CSV_HEADERS = [
  "No.",
  "大分類",
  "商品タイプ",
  "商品タイプ(スタイル)",
  "ステータス",
  "運用商品名",
  "運用商品名(略称)",
  "提供・委託会社",
  "信託報酬（％）（税込）",
  "信託財産保留額（％）",
] as const;

export type IdecoInstrumentCsvRow = {
  catalogNumber: number;
  majorCategoryName: string;
  majorCategoryCode: string;
  productTypeName: string;
  productTypeCode: string;
  productStyleName: string | null;
  productStyleCode: string | null;
  statusName: string | null;
  statusCode: string | null;
  instrumentName: string;
  shortName: string;
  provider: string;
  trustFeeText: string;
  trustReserveText: string;
};

export type ParseIdecoInstrumentsCsvResult = {
  rows: IdecoInstrumentCsvRow[];
};

function assertInstrumentsHeader(headerRow: string[]): void {
  let result: void = undefined;

  if (headerRow.length !== IDECO_INSTRUMENTS_CSV_HEADERS.length) {
    throw new IdecoCsvError(
      `銘柄の情報 CSV ヘッダー列数が不正です（期待: ${IDECO_INSTRUMENTS_CSV_HEADERS.length}）`,
    );
  }

  for (let index = 0; index < IDECO_INSTRUMENTS_CSV_HEADERS.length; index += 1) {
    const expected = IDECO_INSTRUMENTS_CSV_HEADERS[index];
    const actual = headerRow[index].trim();
    if (actual !== expected) {
      throw new IdecoCsvError(
        `銘柄の情報 CSV ヘッダーが不正です（列 ${index + 1}: 期待「${expected}」、実際「${actual}」）`,
      );
    }
  }

  return result;
}

function parseInstrumentDataRow(
  cells: string[],
  lineNumber: number,
): IdecoInstrumentCsvRow {
  let result: IdecoInstrumentCsvRow = {
    catalogNumber: 0,
    majorCategoryName: "",
    majorCategoryCode: "",
    productTypeName: "",
    productTypeCode: "",
    productStyleName: null,
    productStyleCode: null,
    statusName: null,
    statusCode: null,
    instrumentName: "",
    shortName: "",
    provider: "",
    trustFeeText: "",
    trustReserveText: "",
  };

  if (cells.length !== IDECO_INSTRUMENTS_CSV_HEADERS.length) {
    throw new IdecoCsvError(
      `${lineNumber} 行目の列数が不正です（期待: ${IDECO_INSTRUMENTS_CSV_HEADERS.length}）`,
    );
  }

  const catalogNumber = parseJapaneseInteger(cells[0]);
  if (!Number.isFinite(catalogNumber) || catalogNumber <= 0) {
    throw new IdecoCsvError(`${lineNumber} 行目の No. が不正です`);
  }

  const majorCategory = resolveIdecoMajorCategory(cells[1]);
  const productType = resolveIdecoProductType(cells[2]);
  const productStyle = resolveIdecoProductStyle(cells[3]);
  const status = resolveIdecoInstrumentStatus(cells[4]);
  const instrumentName = cells[5].trim();
  const shortName = cells[6].trim();
  const provider = cells[7].trim();
  const trustFeeText = cells[8].trim();
  const trustReserveText = cells[9].trim();

  if (instrumentName === "") {
    throw new IdecoCsvError(`${lineNumber} 行目の運用商品名が空です`);
  }

  if (shortName === "") {
    throw new IdecoCsvError(`${lineNumber} 行目の運用商品名(略称)が空です`);
  }

  result = {
    catalogNumber,
    majorCategoryName: majorCategory.name,
    majorCategoryCode: majorCategory.code,
    productTypeName: productType.name,
    productTypeCode: productType.code,
    productStyleName: productStyle?.name ?? null,
    productStyleCode: productStyle?.code ?? null,
    statusName: status?.name ?? null,
    statusCode: status?.code ?? null,
    instrumentName,
    shortName,
    provider,
    trustFeeText,
    trustReserveText,
  };
  return result;
}

export function parseIdecoInstrumentsCsv(
  content: string,
): ParseIdecoInstrumentsCsvResult {
  let result: ParseIdecoInstrumentsCsvResult = { rows: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("銘柄の情報 CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("銘柄の情報 CSV にデータ行がありません");
  }

  assertInstrumentsHeader(records[0]);

  const rows: IdecoInstrumentCsvRow[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    rows.push(parseInstrumentDataRow(records[index], lineNumber));
  }

  result = { rows };
  return result;
}
