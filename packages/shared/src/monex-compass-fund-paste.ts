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
  splitMonexPasteCells,
} from "./monex-paste-utils";

export type MonexCompassFundPasteRow = {
  source: "compass";
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

export type ParseMonexCompassFundPasteResult = {
  rows: MonexCompassFundPasteRow[];
};

function isCompassHeaderLine(line: string): boolean {
  let result = false;

  if (
    line.includes("ファンド名") ||
    line.includes("口座区分") ||
    line.includes("預り区分") ||
    line.includes("基準価額") ||
    line.includes("分配金") ||
    line.includes("保有数") ||
    line.includes("発注数") ||
    line.includes("平均取得単価") ||
    line.includes("概算評価額") ||
    line.includes("概算評価損益") ||
    line.includes("（円）") ||
    line.includes("(円)")
  ) {
    result = true;
  }

  return result;
}

function isCompassFundStart(line: string): boolean {
  let result = false;

  if (isMonexNoiseLine(line) || isCompassHeaderLine(line)) {
    return result;
  }

  const cells = splitMonexPasteCells(line);
  if (cells.length < 2) {
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

function parseCompassFundBlock(
  lines: string[],
  startIndex: number,
): { row: MonexCompassFundPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as MonexCompassFundPasteRow,
    nextIndex: startIndex + 1,
  };

  const nameCells = splitMonexPasteCells(lines[startIndex]);
  const accountType = nameCells[nameCells.length - 1];
  const instrumentName = nameCells.slice(0, -1).join("\t").trim();
  let index = startIndex + 1;

  if (index >= lines.length) {
    throw new MonexCsvError(`ON COMPASS「${instrumentName}」の預り区分行がありません`);
  }

  const custodyCells = splitMonexPasteCells(lines[index]);
  const custodyType = custodyCells[0] ?? "";
  const unitPriceMinor = parseMonexPasteInteger(custodyCells[1] ?? "");
  const dividendOption = custodyCells[2] ?? "";
  index += 1;

  if (index >= lines.length) {
    throw new MonexCsvError(`ON COMPASS「${instrumentName}」の保有数行がありません`);
  }

  const quantity = parseMonexPasteInteger(lines[index]);
  index += 1;

  if (index < lines.length) {
    const maybeOrderQty = parseMonexPasteInteger(lines[index]);
    if (Number.isFinite(maybeOrderQty) && !lines[index].includes("\t")) {
      index += 1;
    }
  }

  if (index >= lines.length) {
    throw new MonexCsvError(`ON COMPASS「${instrumentName}」の評価額行がありません`);
  }

  const valueCells = splitMonexPasteCells(lines[index]);
  if (valueCells.length < 3) {
    throw new MonexCsvError(`ON COMPASS「${instrumentName}」の評価額行が不正です`);
  }

  const avgCostMinor = parseMonexPasteInteger(valueCells[0] ?? "");
  const marketValueMinor = parseMonexPasteInteger(valueCells[1] ?? "");
  const unrealizedGainMinor = parseMonexPasteInteger(valueCells[2] ?? "");
  index += 1;

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(avgCostMinor) ||
    !Number.isFinite(marketValueMinor) ||
    !Number.isFinite(unrealizedGainMinor)
  ) {
    throw new MonexCsvError(`ON COMPASS「${instrumentName}」の数値が不正です`);
  }

  const bookValueMinor = computeMonexMutualFundBookValueMinor(avgCostMinor, quantity);
  let unrealizedGainRate = 0;
  if (bookValueMinor > 0) {
    unrealizedGainRate = unrealizedGainMinor / bookValueMinor;
  }

  result = {
    row: {
      source: "compass",
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

export function parseMonexCompassFundPaste(
  lines: string[],
): ParseMonexCompassFundPasteResult {
  let result: ParseMonexCompassFundPasteResult = { rows: [] };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (isMonexNoiseLine(line) || isCompassHeaderLine(line) || !isCompassFundStart(line)) {
      index += 1;
      continue;
    }

    const parsed = parseCompassFundBlock(lines, index);
    result.rows.push(parsed.row);
    index = parsed.nextIndex;
  }

  return result;
}
