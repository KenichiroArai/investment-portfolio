import {
  buildMonexAccountId,
  buildMonexAccountName,
} from "./monex-csv-utils";
import { computeMonexMutualFundBookValueMinor } from "./monex-holding-metrics";
import {
  isMonexAccountTypeLabel,
  isMonexNoiseLine,
  MonexCsvError,
  parseMonexPasteInteger,
  parseMonexPastePercentRate,
  splitMonexPasteCells,
} from "./monex-paste-utils";

export type MonexDomesticHoldingsPasteRow = {
  source: "domestic";
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
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseMonexDomesticHoldingsPasteResult = {
  rows: MonexDomesticHoldingsPasteRow[];
};

function isDomesticHeaderLine(line: string): boolean {
  let result = false;

  if (
    line.includes("銘柄") ||
    line.includes("口座区分") ||
    line.includes("預り区分") ||
    line.includes("基準価額") ||
    line.includes("前日比") ||
    line.includes("分配金") ||
    line.includes("保有数") ||
    line.includes("平均取得単価") ||
    line.includes("概算評価額") ||
    line.includes("評価損益") ||
    line.includes("取扱い") ||
    line.includes("（円）") ||
    line.includes("(円)") ||
    line.includes("取引") ||
    line.includes("時価総額") ||
    line.includes("銘柄名")
  ) {
    result = true;
  }

  return result;
}

function isDomesticFundStart(line: string): boolean {
  let result = false;

  if (isMonexNoiseLine(line)) {
    return result;
  }

  const cells = splitMonexPasteCells(line);
  if (cells.length < 2) {
    return result;
  }

  if (cells.includes("米国")) {
    return result;
  }

  const accountType = cells[cells.length - 1];
  if (!isMonexAccountTypeLabel(accountType)) {
    return result;
  }

  const instrumentName = cells.slice(0, -1).join("\t").trim();
  if (instrumentName === "") {
    return result;
  }

  result = true;
  return result;
}

function parseDomesticFundBlock(
  lines: string[],
  startIndex: number,
): { row: MonexDomesticHoldingsPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as MonexDomesticHoldingsPasteRow,
    nextIndex: startIndex + 1,
  };

  const nameCells = splitMonexPasteCells(lines[startIndex]);
  const accountType = nameCells[nameCells.length - 1];
  const instrumentName = nameCells.slice(0, -1).join("\t").trim();

  let index = startIndex + 1;
  while (index < lines.length && isMonexNoiseLine(lines[index])) {
    index += 1;
  }

  if (index >= lines.length) {
    throw new MonexCsvError(`国内株等「${instrumentName}」の預り区分行がありません`);
  }

  const custodyCells = splitMonexPasteCells(lines[index]);
  const custodyType = custodyCells[0] ?? "";
  const unitPriceMinor = parseMonexPasteInteger(custodyCells[1] ?? "");
  index += 1;

  let dividendOption = "";
  if (index < lines.length) {
    const dividendCells = splitMonexPasteCells(lines[index]);
    const dividendCell = dividendCells.find(
      (cell) => cell.includes("再投資") || cell.includes("受取"),
    );
    if (dividendCell) {
      dividendOption = dividendCell;
      index += 1;
    }
  }

  while (index < lines.length) {
    const line = lines[index];
    if (line.includes("再投資中") || line.includes("受取中") || line === "（変更）") {
      index += 1;
      continue;
    }
    break;
  }

  if (index >= lines.length) {
    throw new MonexCsvError(`国内株等「${instrumentName}」の数量行がありません`);
  }

  let quantityLine = lines[index];
  let quantityCells = splitMonexPasteCells(quantityLine);
  if (quantityCells[0] === "（変更）" || quantityCells[0] === "(変更)") {
    quantityCells = quantityCells.slice(1);
  }
  if (quantityCells.length < 3) {
    throw new MonexCsvError(`国内株等「${instrumentName}」の数量・評価額行が不正です`);
  }

  const quantity = parseMonexPasteInteger(quantityCells[0] ?? "");
  const avgCostMinor = parseMonexPasteInteger(quantityCells[1] ?? "");
  const marketValueMinor = parseMonexPasteInteger(quantityCells[2] ?? "");
  index += 1;

  if (index >= lines.length) {
    throw new MonexCsvError(`国内株等「${instrumentName}」の評価損益行がありません`);
  }

  const gainLine = lines[index];
  const gainCells = splitMonexPasteCells(gainLine);
  let unrealizedGainMinor = parseMonexPasteInteger(gainCells[0] ?? "");
  let unrealizedGainRate = Number.NaN;

  if (gainCells.length >= 2 && (gainCells[1].includes("%") || gainCells[1].includes("％"))) {
    unrealizedGainRate = parseMonexPastePercentRate(gainCells[1]);
    index += 1;
  } else if (gainLine.includes("%") || gainLine.includes("％")) {
    unrealizedGainRate = parseMonexPastePercentRate(gainLine);
    index += 1;
  } else {
    index += 1;
    if (index < lines.length) {
      unrealizedGainRate = parseMonexPastePercentRate(lines[index]);
      index += 1;
    }
  }

  while (index < lines.length && (lines[index] === "買付" || lines[index] === "売却")) {
    index += 1;
  }

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(avgCostMinor) ||
    !Number.isFinite(marketValueMinor) ||
    !Number.isFinite(unrealizedGainMinor) ||
    !Number.isFinite(unrealizedGainRate)
  ) {
    throw new MonexCsvError(`国内株等「${instrumentName}」の数値が不正です`);
  }

  const bookValueMinor = computeMonexMutualFundBookValueMinor(avgCostMinor, quantity);

  result = {
    row: {
      source: "domestic",
      instrumentName,
      accountId: buildMonexAccountId(accountType, custodyType),
      accountName: buildMonexAccountName(accountType, custodyType),
      accountType,
      custodyType,
      unitPriceMinor: Number.isFinite(unitPriceMinor) ? unitPriceMinor : 0,
      dividendOption,
      quantity,
      avgCostMinor,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainMinor,
      unrealizedGainRate,
    },
    nextIndex: index,
  };
  return result;
}

export function parseMonexDomesticHoldingsPaste(
  lines: string[],
): ParseMonexDomesticHoldingsPasteResult {
  let result: ParseMonexDomesticHoldingsPasteResult = { rows: [] };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (isMonexNoiseLine(line) || !isDomesticFundStart(line)) {
      index += 1;
      continue;
    }

    const parsed = parseDomesticFundBlock(lines, index);
    result.rows.push(parsed.row);
    index = parsed.nextIndex;
  }

  return result;
}
