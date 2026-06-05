export const IDECO_KAKEIBO_CSV_HEADERS = [
  "番号",
  "日付",
  "商品タイプ",
  "運用商品名",
  "時価単価(1万口当り)",
  "残高数量",
  "資産残高",
  "購入金額",
  "損益",
  "損益率",
] as const;

export type IdecoProductTypeDefinition = {
  name: string;
  code: string;
  sortOrder: number;
};

export const IDECO_PRODUCT_TYPES: IdecoProductTypeDefinition[] = [
  { name: "国内株式", code: "domestic_equity", sortOrder: 0 },
  { name: "内外株式", code: "domestic_foreign_equity", sortOrder: 1 },
  { name: "海外株式", code: "foreign_equity", sortOrder: 2 },
  { name: "国内債券", code: "domestic_bond", sortOrder: 3 },
  { name: "海外債券", code: "foreign_bond", sortOrder: 4 },
  { name: "国内不動産投信", code: "domestic_reit", sortOrder: 5 },
  { name: "海外不動産投信", code: "foreign_reit", sortOrder: 6 },
  { name: "内外資産複合", code: "balanced", sortOrder: 7 },
  { name: "国内その他資産", code: "domestic_other", sortOrder: 8 },
  { name: "元本確保", code: "principal_protected", sortOrder: 9 },
];

const PRODUCT_TYPE_BY_NAME = new Map(
  IDECO_PRODUCT_TYPES.map((item) => {
    let result: [string, (typeof IDECO_PRODUCT_TYPES)[number]] = [
      item.name,
      item,
    ];
    return result;
  }),
);

export type IdecoKakeiboCsvRow = {
  rowNumber: number;
  asOfDate: string;
  productTypeName: string;
  productTypeCode: string;
  instrumentName: string;
  unitPricePerTenThousandLots: number;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseIdecoKakeiboCsvResult = {
  asOfDate: string;
  rows: IdecoKakeiboCsvRow[];
};

export class IdecoKakeiboCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdecoKakeiboCsvError";
  }
}

export function stripUtf8Bom(content: string): string {
  let result = content;
  if (result.charCodeAt(0) === 0xfeff) {
    result = result.slice(1);
  }
  return result;
}

export function parseJapaneseInteger(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return result;
  }

  result = Number.parseInt(normalized, 10);
  return result;
}

export function thousandsYenToYen(thousands: number): number {
  let result = thousands * 1000;
  return result;
}

export function parseJapanesePercentRate(value: string): number {
  let result = Number.NaN;

  const trimmed = value.trim();
  if (!trimmed.endsWith("%")) {
    return result;
  }

  const normalized = trimmed.slice(0, -1).trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return result;
  }

  const percent = Number.parseFloat(normalized);
  if (!Number.isFinite(percent)) {
    return result;
  }

  result = percent / 100;
  return result;
}

export function parseIdecoKakeiboDate(value: string): string {
  let result = "";

  const trimmed = value.trim();
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (!match) {
    throw new IdecoKakeiboCsvError(`日付の形式が不正です: ${value}`);
  }

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  result = `${year}-${month}-${day}`;
  return result;
}

export function resolveIdecoProductType(name: string): IdecoProductTypeDefinition {
  let result: IdecoProductTypeDefinition | null = null;

  const definition = PRODUCT_TYPE_BY_NAME.get(name.trim());
  if (!definition) {
    throw new IdecoKakeiboCsvError(`未対応の商品タイプです: ${name}`);
  }

  result = definition;
  return result;
}

function parseCsvRecords(content: string): string[][] {
  let result: string[][] = [];
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRecord.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n" || character === "\r") {
      if (character === "\r" && content[index + 1] === "\n") {
        index += 1;
      }
      currentRecord.push(currentField);
      if (currentRecord.some((cell) => cell.length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentField = "";
      continue;
    }

    currentField += character;
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  result = records;
  return result;
}

function assertHeader(headerRow: string[]): void {
  let result: void = undefined;

  if (headerRow.length !== IDECO_KAKEIBO_CSV_HEADERS.length) {
    throw new IdecoKakeiboCsvError(
      `CSV ヘッダー列数が不正です（期待: ${IDECO_KAKEIBO_CSV_HEADERS.length}）`,
    );
  }

  for (let index = 0; index < IDECO_KAKEIBO_CSV_HEADERS.length; index += 1) {
    const expected = IDECO_KAKEIBO_CSV_HEADERS[index];
    const actual = headerRow[index].trim();
    if (actual !== expected) {
      throw new IdecoKakeiboCsvError(
        `CSV ヘッダーが不正です（列 ${index + 1}: 期待「${expected}」、実際「${actual}」）`,
      );
    }
  }

  return result;
}

function parseDataRow(cells: string[], lineNumber: number): IdecoKakeiboCsvRow {
  let result: IdecoKakeiboCsvRow = {
    rowNumber: 0,
    asOfDate: "",
    productTypeName: "",
    productTypeCode: "",
    instrumentName: "",
    unitPricePerTenThousandLots: 0,
    quantity: 0,
    marketValueMinor: 0,
    bookValueMinor: 0,
    unrealizedGainMinor: 0,
    unrealizedGainRate: 0,
  };

  if (cells.length !== IDECO_KAKEIBO_CSV_HEADERS.length) {
    throw new IdecoKakeiboCsvError(
      `${lineNumber} 行目の列数が不正です（期待: ${IDECO_KAKEIBO_CSV_HEADERS.length}）`,
    );
  }

  const rowNumber = parseJapaneseInteger(cells[0]);
  if (!Number.isFinite(rowNumber) || rowNumber <= 0) {
    throw new IdecoKakeiboCsvError(`${lineNumber} 行目の番号が不正です`);
  }

  const asOfDate = parseIdecoKakeiboDate(cells[1]);
  const productType = resolveIdecoProductType(cells[2]);
  const instrumentName = cells[3].trim();
  if (instrumentName === "") {
    throw new IdecoKakeiboCsvError(`${lineNumber} 行目の運用商品名が空です`);
  }

  const unitPricePerTenThousandLots = parseJapaneseInteger(cells[4]);
  const quantity = parseJapaneseInteger(cells[5]);
  const marketValueThousands = parseJapaneseInteger(cells[6]);
  const bookValueThousands = parseJapaneseInteger(cells[7]);
  const unrealizedGainThousands = parseJapaneseInteger(cells[8]);
  const unrealizedGainRate = parseJapanesePercentRate(cells[9]);

  if (
    !Number.isFinite(unitPricePerTenThousandLots) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(marketValueThousands) ||
    !Number.isFinite(bookValueThousands) ||
    !Number.isFinite(unrealizedGainThousands) ||
    !Number.isFinite(unrealizedGainRate)
  ) {
    throw new IdecoKakeiboCsvError(`${lineNumber} 行目の数値が不正です`);
  }

  if (quantity <= 0) {
    throw new IdecoKakeiboCsvError(`${lineNumber} 行目の残高数量が不正です`);
  }

  result = {
    rowNumber,
    asOfDate,
    productTypeName: productType.name,
    productTypeCode: productType.code,
    instrumentName,
    unitPricePerTenThousandLots,
    quantity,
    marketValueMinor: thousandsYenToYen(marketValueThousands),
    bookValueMinor: thousandsYenToYen(bookValueThousands),
    unrealizedGainMinor: thousandsYenToYen(unrealizedGainThousands),
    unrealizedGainRate,
  };
  return result;
}

export function parseIdecoKakeiboCsv(content: string): ParseIdecoKakeiboCsvResult {
  let result: ParseIdecoKakeiboCsvResult = { asOfDate: "", rows: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoKakeiboCsvError("CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoKakeiboCsvError("CSV にデータ行がありません");
  }

  assertHeader(records[0]);

  const rows: IdecoKakeiboCsvRow[] = [];
  let asOfDate = "";

  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    const row = parseDataRow(records[index], lineNumber);
    if (asOfDate === "") {
      asOfDate = row.asOfDate;
    }
    if (row.asOfDate !== asOfDate) {
      throw new IdecoKakeiboCsvError(
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
