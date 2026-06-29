import {
  IdecoCsvError,
  parseGainRate,
  parseJapaneseInteger,
  stripUtf8Bom,
} from "./ideco-csv-utils";

export type IdecoHoldingsPasteRow = {
  productType: string;
  instrumentName: string;
  unitPricePerTenThousandLots: number;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseIdecoHoldingsPasteResult = {
  rows: IdecoHoldingsPasteRow[];
};

function splitPasteLines(content: string): string[] {
  let result: string[] = [];

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    result.push(trimmed);
  }

  return result;
}

function isPasteHeaderLine(line: string): boolean {
  let result = false;

  if (line.includes("商品タイプ") && line.includes("運用商品名")) {
    result = true;
    return result;
  }

  if (line.includes("(1万口当り)") || line.includes("（1万口当り）")) {
    result = true;
    return result;
  }

  if (/^損益率(\s|$)/.test(line)) {
    result = true;
    return result;
  }

  return result;
}

function skipPasteHeaderLines(lines: string[]): number {
  let result = 0;

  while (result < lines.length && isPasteHeaderLine(lines[result])) {
    result += 1;
  }

  return result;
}

export function parseIdecoYenValue(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/円/g, "").replace(/,/g, "").trim();
  if (normalized === "" || normalized === "-") {
    return result;
  }

  result = Number.parseInt(normalized, 10);
  return result;
}

export function parseIdecoLotQuantity(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/口/g, "").replace(/,/g, "").trim();
  if (normalized === "" || normalized === "-") {
    return result;
  }

  result = Number.parseInt(normalized, 10);
  return result;
}

function isGainRateLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();
  if (trimmed.endsWith("％") || trimmed.endsWith("%")) {
    result = true;
  }
  return result;
}

function isDataLine(line: string): boolean {
  let result = false;
  if (line.includes("\t") && (line.includes("円") || line.includes("口"))) {
    result = true;
  }
  return result;
}

function parsePasteDataLine(
  productType: string,
  dataLine: string,
  gainRateLine: string,
  lineNumber: number,
): IdecoHoldingsPasteRow {
  let result: IdecoHoldingsPasteRow = {
    productType: "",
    instrumentName: "",
    unitPricePerTenThousandLots: 0,
    quantity: 0,
    marketValueMinor: 0,
    bookValueMinor: 0,
    unrealizedGainMinor: 0,
    unrealizedGainRate: 0,
  };

  if (!isDataLine(dataLine)) {
    throw new IdecoCsvError(`${lineNumber} 行目付近のデータ行の形式が不正です`);
  }

  if (!isGainRateLine(gainRateLine)) {
    throw new IdecoCsvError(`${lineNumber + 2} 行目の損益率が不正です`);
  }

  const cells = dataLine.split("\t").map((cell) => cell.trim());
  if (cells.length < 6) {
    throw new IdecoCsvError(
      `${lineNumber + 1} 行目の列数が不正です（期待: 6 列以上、実際: ${cells.length}）`,
    );
  }

  const instrumentName = cells[0];
  if (instrumentName === "") {
    throw new IdecoCsvError(`${lineNumber + 1} 行目の運用商品名が空です`);
  }

  const unitPricePerTenThousandLots = parseIdecoYenValue(cells[1]);
  const quantity = parseIdecoLotQuantity(cells[2]);
  const marketValueMinor = parseIdecoYenValue(cells[3]);
  const bookValueMinor = parseIdecoYenValue(cells[4]);
  const unrealizedGainMinor = parseIdecoYenValue(cells[5]);
  const unrealizedGainRate = parseGainRate(gainRateLine);

  if (
    !Number.isFinite(unitPricePerTenThousandLots) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(marketValueMinor) ||
    !Number.isFinite(bookValueMinor) ||
    !Number.isFinite(unrealizedGainMinor) ||
    !Number.isFinite(unrealizedGainRate)
  ) {
    throw new IdecoCsvError(`${lineNumber + 1} 行目付近の数値が不正です`);
  }

  if (quantity <= 0) {
    throw new IdecoCsvError(`${lineNumber + 1} 行目の残高数量が不正です`);
  }

  result = {
    productType,
    instrumentName,
    unitPricePerTenThousandLots,
    quantity,
    marketValueMinor,
    bookValueMinor,
    unrealizedGainMinor,
    unrealizedGainRate,
  };
  return result;
}

function assertUniquePasteInstrumentNames(rows: IdecoHoldingsPasteRow[]): void {
  let result: void = undefined;
  const seen = new Map<string, number>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const existingIndex = seen.get(row.instrumentName);
    if (existingIndex !== undefined) {
      throw new IdecoCsvError(
        `運用商品名「${row.instrumentName}」が重複しています（${existingIndex + 1} 件目と ${index + 1} 件目）`,
      );
    }
    seen.set(row.instrumentName, index);
  }

  return result;
}

export function parseIdecoHoldingsPaste(content: string): ParseIdecoHoldingsPasteResult {
  let result: ParseIdecoHoldingsPasteResult = { rows: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("貼り付けデータが空です");
  }

  const lines = splitPasteLines(normalized);
  const dataStartIndex = skipPasteHeaderLines(lines);
  const dataLines = lines.slice(dataStartIndex);

  if (dataLines.length === 0) {
    throw new IdecoCsvError("貼り付けデータに保有明細行がありません");
  }

  if (dataLines.length % 3 !== 0) {
    throw new IdecoCsvError(
      `貼り付けデータの行数が不正です（データ部は 3 行単位である必要があります、実際: ${dataLines.length} 行）`,
    );
  }

  const rows: IdecoHoldingsPasteRow[] = [];
  for (let index = 0; index < dataLines.length; index += 3) {
    const lineNumber = dataStartIndex + index + 1;
    const productType = dataLines[index];
    const dataLine = dataLines[index + 1];
    const gainRateLine = dataLines[index + 2];

    if (productType === "" || isDataLine(productType) || isGainRateLine(productType)) {
      throw new IdecoCsvError(`${lineNumber} 行目の商品タイプが不正です`);
    }

    const row = parsePasteDataLine(productType, dataLine, gainRateLine, lineNumber);
    rows.push(row);
  }

  assertUniquePasteInstrumentNames(rows);
  result = { rows };
  return result;
}
