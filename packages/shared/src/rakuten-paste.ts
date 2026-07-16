import {
  buildRakutenAccountId,
  buildRakutenAccountName,
} from "./rakuten-csv-utils";
import {
  computeRakutenEquityBookValueMinor,
  computeRakutenMutualFundBookValueMinor,
} from "./rakuten-holding-metrics";
import {
  detectRakutenBlockKind,
  isRakutenAccountTypeLabel,
  isRakutenHeaderLine,
  isRakutenStockCode,
  parseRakutenPasteNumber,
  parseRakutenPastePercentRate,
  RakutenPasteError,
  splitRakutenPasteCells,
  splitRakutenPasteLines,
  type RakutenPasteProductKind,
} from "./rakuten-paste-utils";

export type RakutenHoldingPasteRow = {
  source: RakutenPasteProductKind;
  instrumentName: string;
  ticker: string | null;
  accountId: string;
  accountName: string;
  accountType: string;
  quantity: number;
  unitPriceMinor: number;
  avgCostMinor: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseRakutenPasteResult = {
  holdings: RakutenHoldingPasteRow[];
};

function resolveAccountFields(rawAccountType: string): {
  accountType: string;
  accountId: string;
  accountName: string;
} {
  let result = {
    accountType: "不明",
    accountId: "rakuten:unknown",
    accountName: "不明口座",
  };

  const normalized = rawAccountType.trim().normalize("NFKC");
  if (normalized === "-" || normalized === "") {
    result = {
      accountType: "ラップ",
      accountId: buildRakutenAccountId("ラップ"),
      accountName: buildRakutenAccountName("ラップ"),
    };
    return result;
  }

  result = {
    accountType: normalized,
    accountId: buildRakutenAccountId(normalized),
    accountName: buildRakutenAccountName(normalized),
  };
  return result;
}

function finishRow(params: {
  source: RakutenPasteProductKind;
  instrumentName: string;
  ticker: string | null;
  accountTypeRaw: string;
  quantity: number;
  unitPriceMinor: number;
  avgCostMinor: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainRate: number;
}): RakutenHoldingPasteRow {
  let result: RakutenHoldingPasteRow;
  const account = resolveAccountFields(params.accountTypeRaw);
  const unrealizedGainMinor = params.marketValueMinor - params.bookValueMinor;
  let unrealizedGainRate = params.unrealizedGainRate;

  if (!Number.isFinite(unrealizedGainRate) && params.bookValueMinor > 0) {
    unrealizedGainRate = unrealizedGainMinor / params.bookValueMinor;
  }
  if (!Number.isFinite(unrealizedGainRate)) {
    unrealizedGainRate = 0;
  }

  result = {
    source: params.source,
    instrumentName: params.instrumentName,
    ticker: params.ticker,
    accountId: account.accountId,
    accountName: account.accountName,
    accountType: account.accountType,
    quantity: params.quantity,
    unitPriceMinor: Number.isFinite(params.unitPriceMinor) ? params.unitPriceMinor : 0,
    avgCostMinor: Number.isFinite(params.avgCostMinor) ? params.avgCostMinor : 0,
    marketValueMinor: params.marketValueMinor,
    bookValueMinor: params.bookValueMinor,
    unrealizedGainMinor,
    unrealizedGainRate,
  };
  return result;
}

function skipTrailingDashOrEmpty(lines: string[], index: number): number {
  let result = index;
  while (result < lines.length) {
    const trimmed = lines[result].trim();
    if (trimmed === "-" || trimmed === "---") {
      result += 1;
      continue;
    }
    break;
  }
  return result;
}

function readGainRateLine(lines: string[], index: number): {
  rate: number;
  nextIndex: number;
} {
  let result = { rate: Number.NaN, nextIndex: index };

  if (index >= lines.length) {
    return result;
  }

  const line = lines[index].trim();
  if (line === "-" || line === "---") {
    result = { rate: Number.NaN, nextIndex: index + 1 };
    return result;
  }

  if (line.includes("%") || line.includes("％")) {
    result = {
      rate: parseRakutenPastePercentRate(line),
      nextIndex: index + 1,
    };
    return result;
  }

  return result;
}

function parseDomesticEquityBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const startCells = splitRakutenPasteCells(lines[startIndex]);
  const ticker = (startCells[1] ?? "").trim();
  if (!isRakutenStockCode(ticker)) {
    throw new RakutenPasteError(`国内株式の銘柄コードが不正です: ${ticker || "(空)"}`);
  }

  let index = startIndex + 1;
  if (index >= lines.length) {
    throw new RakutenPasteError(`国内株式「${ticker}」の銘柄名行がありません`);
  }

  const nameCells = splitRakutenPasteCells(lines[index]);
  const instrumentName = (nameCells[0] ?? "").trim();
  if (instrumentName === "") {
    throw new RakutenPasteError(`国内株式「${ticker}」の銘柄名が空です`);
  }
  index += 1;

  if (index >= lines.length) {
    throw new RakutenPasteError(`国内株式「${instrumentName}」の口座・数量行がありません`);
  }

  const qtyCells = splitRakutenPasteCells(lines[index]);
  const accountTypeRaw = qtyCells[0] ?? "";
  if (!isRakutenAccountTypeLabel(accountTypeRaw)) {
    throw new RakutenPasteError(
      `国内株式「${instrumentName}」の口座区分が不正です: ${accountTypeRaw}`,
    );
  }

  const quantity = parseRakutenPasteNumber(qtyCells[1] ?? "");
  const avgCostMinor = parseRakutenPasteNumber(qtyCells[2] ?? "");
  index += 1;

  if (!Number.isFinite(quantity)) {
    throw new RakutenPasteError(`国内株式「${instrumentName}」の保有数量が不正です`);
  }

  if (index >= lines.length) {
    throw new RakutenPasteError(`国内株式「${instrumentName}」の現在値行がありません`);
  }
  const unitPriceMinor = parseRakutenPasteNumber(lines[index]);
  index += 1;

  // 前日比
  if (index < lines.length) {
    index += 1;
  }

  if (index >= lines.length) {
    throw new RakutenPasteError(`国内株式「${instrumentName}」の時価評価額行がありません`);
  }
  const marketValueMinor = parseRakutenPasteNumber(lines[index]);
  index += 1;

  if (!Number.isFinite(marketValueMinor)) {
    throw new RakutenPasteError(`国内株式「${instrumentName}」の時価評価額が不正です`);
  }

  const gain = readGainRateLine(lines, index);
  index = gain.nextIndex;

  const bookValueMinor = Number.isFinite(avgCostMinor)
    ? computeRakutenEquityBookValueMinor(avgCostMinor, quantity)
    : marketValueMinor;

  result = {
    row: finishRow({
      source: "domestic_equity",
      instrumentName,
      ticker,
      accountTypeRaw,
      quantity,
      unitPriceMinor,
      avgCostMinor: Number.isFinite(avgCostMinor) ? avgCostMinor : 0,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseFundLikeHeaderLine(line: string): {
  instrumentName: string;
  accountTypeRaw: string;
  quantity: number;
  avgCostMinor: number;
} {
  let result = {
    instrumentName: "",
    accountTypeRaw: "",
    quantity: Number.NaN,
    avgCostMinor: Number.NaN,
  };

  const cells = splitRakutenPasteCells(line);
  // 投資信託\t名称\t口座\t数量\t平均取得
  // または MMF\t名称\t口座\t数量\t平均取得
  // または 楽天・マネーファンド\t名称\t口座\t数量\t...
  const instrumentName = (cells[1] ?? "").trim();
  const accountTypeRaw = cells[2] ?? "";
  const quantity = parseRakutenPasteNumber(cells[3] ?? "");
  const avgCostMinor = parseRakutenPasteNumber(cells[4] ?? "");

  result = { instrumentName, accountTypeRaw, quantity, avgCostMinor };
  return result;
}

function parseMutualFundStyleTail(
  lines: string[],
  index: number,
  instrumentName: string,
): {
  unitPriceMinor: number;
  marketValueMinor: number;
  unrealizedGainRate: number;
  nextIndex: number;
} {
  let result = {
    unitPriceMinor: 0,
    marketValueMinor: 0,
    unrealizedGainRate: Number.NaN,
    nextIndex: index,
  };

  let cursor = index;
  if (cursor >= lines.length) {
    throw new RakutenPasteError(`「${instrumentName}」の現在値行がありません`);
  }

  const unitPriceMinor = parseRakutenPasteNumber(lines[cursor]);
  cursor += 1;

  // 前日比（円 or -）
  if (cursor < lines.length) {
    cursor += 1;
  }

  if (cursor >= lines.length) {
    throw new RakutenPasteError(`「${instrumentName}」の時価評価額行がありません`);
  }
  const marketValueMinor = parseRakutenPasteNumber(lines[cursor]);
  cursor += 1;

  if (!Number.isFinite(marketValueMinor)) {
    throw new RakutenPasteError(`「${instrumentName}」の時価評価額が不正です`);
  }

  const gain = readGainRateLine(lines, cursor);
  cursor = gain.nextIndex;

  result = {
    unitPriceMinor: Number.isFinite(unitPriceMinor) ? unitPriceMinor : 0,
    marketValueMinor,
    unrealizedGainRate: gain.rate,
    nextIndex: cursor,
  };
  return result;
}

function parseMoneyFundTail(
  lines: string[],
  index: number,
  instrumentName: string,
): {
  unitPriceMinor: number;
  marketValueMinor: number;
  unrealizedGainRate: number;
  nextIndex: number;
} {
  let result = {
    unitPriceMinor: 0,
    marketValueMinor: 0,
    unrealizedGainRate: Number.NaN,
    nextIndex: index,
  };

  let cursor = skipTrailingDashOrEmpty(lines, index);
  if (cursor >= lines.length) {
    throw new RakutenPasteError(`「${instrumentName}」の時価評価額行がありません`);
  }

  const marketValueMinor = parseRakutenPasteNumber(lines[cursor]);
  cursor += 1;
  if (!Number.isFinite(marketValueMinor)) {
    throw new RakutenPasteError(`「${instrumentName}」の時価評価額が不正です`);
  }

  const gain = readGainRateLine(lines, cursor);
  cursor = gain.nextIndex;

  result = {
    unitPriceMinor: 0,
    marketValueMinor,
    unrealizedGainRate: gain.rate,
    nextIndex: cursor,
  };
  return result;
}

function parseMutualFundBlock(
  lines: string[],
  startIndex: number,
  source: "mutual_fund" | "money_fund",
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const header = parseFundLikeHeaderLine(lines[startIndex]);
  if (header.instrumentName === "") {
    throw new RakutenPasteError(`${source} の銘柄名が空です`);
  }
  if (!isRakutenAccountTypeLabel(header.accountTypeRaw)) {
    throw new RakutenPasteError(
      `「${header.instrumentName}」の口座区分が不正です: ${header.accountTypeRaw}`,
    );
  }
  if (!Number.isFinite(header.quantity)) {
    throw new RakutenPasteError(`「${header.instrumentName}」の保有数量が不正です`);
  }

  const tail =
    source === "money_fund"
      ? parseMoneyFundTail(lines, startIndex + 1, header.instrumentName)
      : parseMutualFundStyleTail(lines, startIndex + 1, header.instrumentName);

  let bookValueMinor = tail.marketValueMinor;
  if (Number.isFinite(header.avgCostMinor) && header.avgCostMinor > 0) {
    bookValueMinor = computeRakutenMutualFundBookValueMinor(
      header.avgCostMinor,
      header.quantity,
    );
  }

  result = {
    row: finishRow({
      source,
      instrumentName: header.instrumentName,
      ticker: null,
      accountTypeRaw: header.accountTypeRaw,
      quantity: header.quantity,
      unitPriceMinor: tail.unitPriceMinor,
      avgCostMinor: Number.isFinite(header.avgCostMinor) ? header.avgCostMinor : 0,
      marketValueMinor: tail.marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: tail.unrealizedGainRate,
    }),
    nextIndex: tail.nextIndex,
  };
  return result;
}

function parseFxMmfBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  let headerIndex = startIndex;
  const firstCells = splitRakutenPasteCells(lines[startIndex]);
  const first = (firstCells[0] ?? "").trim().normalize("NFKC");

  if (first === "外貨建") {
    headerIndex = startIndex + 1;
    if (headerIndex >= lines.length) {
      throw new RakutenPasteError("外貨建MMFの明細行がありません");
    }
  }

  const headerLine = lines[headerIndex];
  const headerCells = splitRakutenPasteCells(headerLine);
  const mmfLabel = (headerCells[0] ?? "").trim().normalize("NFKC");
  if (mmfLabel !== "MMF") {
    throw new RakutenPasteError(`外貨建MMFの行形式が不正です: ${headerLine}`);
  }

  const instrumentName = (headerCells[1] ?? "").trim();
  const accountTypeRaw = headerCells[2] ?? "";
  const quantity = parseRakutenPasteNumber(headerCells[3] ?? "");
  const avgCostMinor = parseRakutenPasteNumber(headerCells[4] ?? "");

  if (instrumentName === "") {
    throw new RakutenPasteError("外貨建MMFの銘柄名が空です");
  }
  if (!Number.isFinite(quantity)) {
    throw new RakutenPasteError(`外貨建MMF「${instrumentName}」の保有数量が不正です`);
  }

  const tail = parseMutualFundStyleTail(lines, headerIndex + 1, instrumentName);

  let bookValueMinor = tail.marketValueMinor;
  if (Number.isFinite(avgCostMinor) && avgCostMinor > 0) {
    bookValueMinor = computeRakutenMutualFundBookValueMinor(avgCostMinor, quantity);
  }

  result = {
    row: finishRow({
      source: "fx_mmf",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor: tail.unitPriceMinor,
      avgCostMinor: Number.isFinite(avgCostMinor) ? avgCostMinor : 0,
      marketValueMinor: tail.marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: tail.unrealizedGainRate,
    }),
    nextIndex: tail.nextIndex,
  };
  return result;
}

function parseDomesticBondBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const cells = splitRakutenPasteCells(lines[startIndex]);
  const instrumentName = (cells[1] ?? "").trim();
  const accountTypeRaw = cells[2] ?? "";
  const quantity = parseRakutenPasteNumber(cells[3] ?? "");
  const avgCostMinor = parseRakutenPasteNumber(cells[4] ?? "");

  if (instrumentName === "") {
    throw new RakutenPasteError("国内債券の銘柄名が空です");
  }
  if (!Number.isFinite(quantity)) {
    throw new RakutenPasteError(`国内債券「${instrumentName}」の保有数量が不正です`);
  }

  let index = startIndex + 1;
  // 現在値（%）
  if (index < lines.length) {
    index += 1;
  }
  // 前日比（%）
  if (index < lines.length) {
    index += 1;
  }

  if (index >= lines.length) {
    throw new RakutenPasteError(`国内債券「${instrumentName}」の時価評価額行がありません`);
  }
  const marketValueMinor = parseRakutenPasteNumber(lines[index]);
  index += 1;

  if (!Number.isFinite(marketValueMinor)) {
    throw new RakutenPasteError(`国内債券「${instrumentName}」の時価評価額が不正です`);
  }

  index = skipTrailingDashOrEmpty(lines, index);
  const gain = readGainRateLine(lines, index);
  index = gain.nextIndex;

  result = {
    row: finishRow({
      source: "domestic_bond",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor: Number.isFinite(avgCostMinor) ? avgCostMinor : 0,
      avgCostMinor: Number.isFinite(avgCostMinor) ? avgCostMinor : 0,
      marketValueMinor,
      bookValueMinor: marketValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseWrapFundBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  let index = startIndex + 1;
  if (index >= lines.length) {
    throw new RakutenPasteError("楽ラップの銘柄名行がありません");
  }

  const nameCells = splitRakutenPasteCells(lines[index]);
  const instrumentName = (nameCells[0] ?? "").trim();
  if (instrumentName === "" || instrumentName === "現金等") {
    throw new RakutenPasteError("楽ラップの銘柄名が不正です");
  }
  index += 1;

  if (index >= lines.length) {
    throw new RakutenPasteError(`楽ラップ「${instrumentName}」の口座・数量行がありません`);
  }

  const qtyCells = splitRakutenPasteCells(lines[index]);
  const accountTypeRaw = qtyCells[0] ?? "-";
  const quantity = parseRakutenPasteNumber(qtyCells[1] ?? "");
  const avgCostMinor = parseRakutenPasteNumber(qtyCells[2] ?? "");
  index += 1;

  if (!Number.isFinite(quantity)) {
    throw new RakutenPasteError(`楽ラップ「${instrumentName}」の保有数量が不正です`);
  }

  const tail = parseMutualFundStyleTail(lines, index, instrumentName);

  let bookValueMinor = tail.marketValueMinor;
  if (Number.isFinite(avgCostMinor) && avgCostMinor > 0) {
    bookValueMinor = computeRakutenMutualFundBookValueMinor(avgCostMinor, quantity);
  }

  result = {
    row: finishRow({
      source: "wrap_fund",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor: tail.unitPriceMinor,
      avgCostMinor: Number.isFinite(avgCostMinor) ? avgCostMinor : 0,
      marketValueMinor: tail.marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: tail.unrealizedGainRate,
    }),
    nextIndex: tail.nextIndex,
  };
  return result;
}

function parseWrapCashBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  let index = startIndex + 1;
  if (index >= lines.length || !lines[index].includes("現金等")) {
    throw new RakutenPasteError("楽ラップ現金等の行がありません");
  }
  index += 1;

  // 口座行（- のみ、または空セル）
  if (index < lines.length) {
    const cells = splitRakutenPasteCells(lines[index]);
    const first = (cells[0] ?? "").trim();
    if (first === "-" || first === "" || isRakutenAccountTypeLabel(first)) {
      index += 1;
    }
  }

  if (index >= lines.length) {
    throw new RakutenPasteError("楽ラップ現金等の時価評価額行がありません");
  }
  const marketValueMinor = parseRakutenPasteNumber(lines[index]);
  index += 1;

  if (!Number.isFinite(marketValueMinor)) {
    throw new RakutenPasteError("楽ラップ現金等の時価評価額が不正です");
  }

  result = {
    row: finishRow({
      source: "wrap_cash",
      instrumentName: "現金等",
      ticker: null,
      accountTypeRaw: "-",
      quantity: 1,
      unitPriceMinor: marketValueMinor,
      avgCostMinor: marketValueMinor,
      marketValueMinor,
      bookValueMinor: marketValueMinor,
      unrealizedGainRate: 0,
    }),
    nextIndex: index,
  };
  return result;
}

function parseBlockAt(
  lines: string[],
  index: number,
  kind: RakutenPasteProductKind,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result: { row: RakutenHoldingPasteRow; nextIndex: number };

  if (kind === "domestic_equity") {
    result = parseDomesticEquityBlock(lines, index);
    return result;
  }
  if (kind === "mutual_fund") {
    result = parseMutualFundBlock(lines, index, "mutual_fund");
    return result;
  }
  if (kind === "money_fund") {
    result = parseMutualFundBlock(lines, index, "money_fund");
    return result;
  }
  if (kind === "fx_mmf") {
    result = parseFxMmfBlock(lines, index);
    return result;
  }
  if (kind === "domestic_bond") {
    result = parseDomesticBondBlock(lines, index);
    return result;
  }
  if (kind === "wrap_fund") {
    result = parseWrapFundBlock(lines, index);
    return result;
  }
  result = parseWrapCashBlock(lines, index);
  return result;
}

export function parseRakutenPaste(content: string): ParseRakutenPasteResult {
  let result: ParseRakutenPasteResult = { holdings: [] };

  const lines = splitRakutenPasteLines(content);
  if (lines.length === 0) {
    throw new RakutenPasteError("貼り付け内容が空です");
  }

  const holdings: RakutenHoldingPasteRow[] = [];
  let index = 0;

  while (index < lines.length) {
    if (isRakutenHeaderLine(lines[index])) {
      index += 1;
      continue;
    }

    const kind = detectRakutenBlockKind(lines, index);
    if (!kind) {
      index += 1;
      continue;
    }

    // 「外貨建」単独行は次の MMF 行とセットで処理するため、detect が fx_mmf を返す
    const parsed = parseBlockAt(lines, index, kind);
    holdings.push(parsed.row);
    index = parsed.nextIndex;
  }

  if (holdings.length === 0) {
    throw new RakutenPasteError("保有明細を1件も読み取れませんでした");
  }

  result = { holdings };
  return result;
}
