import {
  buildMonexAccountId,
  buildMonexAccountName,
} from "./monex-csv-utils";
import {
  isMonexAccountTypeLabel,
  isMonexNoiseLine,
  MonexCsvError,
  parseMonexPasteInteger,
  parseMonexPastePercentRate,
  splitMonexPasteCells,
} from "./monex-paste-utils";

export type MonexUsStockPasteRow = {
  source: "us";
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
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseMonexUsStocksPasteResult = {
  rows: MonexUsStockPasteRow[];
};

function isUsHeaderLine(line: string): boolean {
  let result = false;

  if (
    line.includes("銘柄") ||
    line.includes("市場") ||
    line.includes("口座区分") ||
    line.includes("預り区分") ||
    line.includes("保有株数") ||
    line.includes("概算簿価単価") ||
    line.includes("概算取得金額") ||
    line.includes("概算評価額") ||
    line.includes("概算評価損益") ||
    line.includes("参考値") ||
    line.includes("取引")
  ) {
    result = true;
  }

  return result;
}

function isTickerLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (trimmed.includes("\t") || isMonexNoiseLine(trimmed) || isUsHeaderLine(trimmed)) {
    return result;
  }

  if (/^[A-Za-z][A-Za-z0-9.\-]{0,11}$/.test(trimmed)) {
    result = true;
  }

  return result;
}

function parseUsStockBlock(
  lines: string[],
  startIndex: number,
): { row: MonexUsStockPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as MonexUsStockPasteRow,
    nextIndex: startIndex + 1,
  };

  const ticker = lines[startIndex].trim();
  let index = startIndex + 1;

  if (index >= lines.length) {
    throw new MonexCsvError(`米国株「${ticker}」の銘柄行がありません`);
  }

  const nameCells = splitMonexPasteCells(lines[index]);
  if (nameCells.length < 3) {
    throw new MonexCsvError(`米国株「${ticker}」の銘柄行が不正です`);
  }

  const accountType = nameCells[nameCells.length - 1];
  const market = nameCells[nameCells.length - 2];
  const instrumentName = nameCells.slice(0, -2).join("\t").trim();
  if (!isMonexAccountTypeLabel(accountType) || instrumentName === "") {
    throw new MonexCsvError(`米国株「${ticker}」の銘柄行が不正です`);
  }
  index += 1;

  if (index >= lines.length) {
    throw new MonexCsvError(`米国株「${ticker}」の保有株数行がありません`);
  }

  const qtyCells = splitMonexPasteCells(lines[index]);
  const custodyType = qtyCells[0] ?? "";
  const quantity = parseMonexPasteInteger(qtyCells[1] ?? "");
  index += 1;

  while (index < lines.length) {
    const line = lines[index];
    if (line.includes("US$") || line.includes("取引")) {
      index += 1;
      continue;
    }
    if (line.includes("%") || line.includes("％")) {
      if (!line.includes("円")) {
        index += 1;
        continue;
      }
    }
    break;
  }

  if (index >= lines.length) {
    throw new MonexCsvError(`米国株「${ticker}」の円建て取得金額行がありません`);
  }

  const bookCells = splitMonexPasteCells(lines[index]);
  const bookValueMinor = parseMonexPasteInteger(bookCells[0] ?? "");
  const avgCostMinor =
    bookCells.length >= 2
      ? parseMonexPasteInteger(bookCells[1] ?? "")
      : bookValueMinor;
  index += 1;

  if (index >= lines.length) {
    throw new MonexCsvError(`米国株「${ticker}」の円建て評価額行がありません`);
  }

  const marketCells = splitMonexPasteCells(lines[index]);
  const marketValueMinor = parseMonexPasteInteger(marketCells[0] ?? "");
  const unrealizedGainMinor = parseMonexPasteInteger(marketCells[1] ?? "");
  index += 1;

  let unrealizedGainRate = Number.NaN;
  if (index < lines.length) {
    unrealizedGainRate = parseMonexPastePercentRate(lines[index]);
    index += 1;
  }

  while (index < lines.length && (lines[index] === "買付" || lines[index] === "売却")) {
    index += 1;
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(bookValueMinor) ||
    !Number.isFinite(marketValueMinor) ||
    !Number.isFinite(unrealizedGainMinor) ||
    !Number.isFinite(unrealizedGainRate)
  ) {
    throw new MonexCsvError(`米国株「${ticker}」の数値が不正です`);
  }

  result = {
    row: {
      source: "us",
      ticker,
      instrumentName,
      market,
      accountId: buildMonexAccountId(accountType, custodyType),
      accountName: buildMonexAccountName(accountType, custodyType),
      accountType,
      custodyType,
      quantity,
      avgCostMinor: Number.isFinite(avgCostMinor) ? avgCostMinor : bookValueMinor,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainMinor,
      unrealizedGainRate,
    },
    nextIndex: index,
  };
  return result;
}

export function parseMonexUsStocksPaste(lines: string[]): ParseMonexUsStocksPasteResult {
  let result: ParseMonexUsStocksPasteResult = { rows: [] };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (isMonexNoiseLine(line) || isUsHeaderLine(line) || !isTickerLine(line)) {
      index += 1;
      continue;
    }

    const parsed = parseUsStockBlock(lines, index);
    result.rows.push(parsed.row);
    index = parsed.nextIndex;
  }

  return result;
}
