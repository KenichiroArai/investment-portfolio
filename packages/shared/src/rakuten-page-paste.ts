import {
  computeRakutenEquityBookValueMinor,
  computeRakutenMutualFundBookValueMinor,
} from "./rakuten-holding-metrics";
import { RakutenPasteError } from "./rakuten-csv-utils";
import {
  extractRakutenLeadingStockCode,
  isRakutenDomesticBondLine,
  isRakutenFxMmfFundLine,
  isRakutenPageMutualFundNameLine,
  isRakutenPageNoiseLine,
  isRakutenWrapFundLine,
  parseRakutenPageAccountSection,
  parseRakutenPasteNumber,
  parseRakutenPastePercentRate,
  type RakutenPasteProductKind,
} from "./rakuten-paste-utils";
import {
  finishRakutenPasteRow,
  type ParseRakutenPasteResult,
  type RakutenHoldingPasteRow,
} from "./rakuten-paste-row";

function throwPageError(message: string, lineNumber: number, hint?: string): never {
  throw new RakutenPasteError(message, { lineNumber, hint });
}

function readNumberAt(
  lines: string[],
  index: number,
  label: string,
  instrumentName: string,
): number {
  let result = Number.NaN;

  if (index >= lines.length) {
    throwPageError(
      `${label}「${instrumentName}」の数値行がありません`,
      index + 1,
      "コピー範囲に銘柄の数量・評価額行が含まれているか確認してください。",
    );
  }

  result = parseRakutenPasteNumber(lines[index]);
  if (!Number.isFinite(result)) {
    throwPageError(
      `${label}「${instrumentName}」の数値が読み取れません: ${lines[index]}`,
      index + 1,
    );
  }

  return result;
}

function skipAnnotationLines(lines: string[], index: number): number {
  let result = index;

  while (result < lines.length) {
    const trimmed = lines[result].trim().normalize("NFKC");
    if (trimmed === "決算発表日" || trimmed === "再投資型") {
      result += 1;
      continue;
    }
    break;
  }

  return result;
}

function skipTotalReturnLine(lines: string[], index: number): number {
  let result = index;

  if (index >= lines.length) {
    return result;
  }

  const line = lines[index];
  if (line.startsWith("\t") || line.startsWith("	")) {
    const parsed = parseRakutenPasteNumber(line);
    if (Number.isFinite(parsed)) {
      result = index + 1;
    }
  }

  return result;
}

function readGainRateOrSkip(
  lines: string[],
  index: number,
): { rate: number; nextIndex: number } {
  let result = { rate: Number.NaN, nextIndex: index };

  if (index >= lines.length) {
    return result;
  }

  const line = lines[index].trim();
  if (line.includes("%") || line.includes("％")) {
    result = {
      rate: parseRakutenPastePercentRate(line),
      nextIndex: index + 1,
    };
    return result;
  }

  result = { rate: Number.NaN, nextIndex: index + 1 };
  return result;
}

function parseDomesticEquityPageBlock(
  lines: string[],
  startIndex: number,
  accountTypeRaw: string,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const ticker = extractRakutenLeadingStockCode(lines[startIndex]);
  if (ticker === null) {
    throwPageError("国内株式の銘柄コードが読み取れません", startIndex + 1);
  }

  let index = startIndex + 1;
  if (index >= lines.length) {
    throwPageError(`国内株式「${ticker}」の銘柄名行がありません`, startIndex + 1);
  }

  const instrumentName = lines[index].trim();
  if (instrumentName === "") {
    throwPageError(`国内株式「${ticker}」の銘柄名が空です`, index + 1);
  }
  index += 1;

  index = skipAnnotationLines(lines, index);
  const quantity = readNumberAt(lines, index, "国内株式", instrumentName);
  index += 1;

  const avgCostMinor = readNumberAt(lines, index, "国内株式", instrumentName);
  index += 1;

  // 取得総額
  index += 1;

  const unitPriceMinor = readNumberAt(lines, index, "国内株式", instrumentName);
  index += 1;

  // 前日比
  index += 1;

  const marketValueMinor = readNumberAt(lines, index, "国内株式", instrumentName);
  index += 1;

  const gain = readGainRateOrSkip(lines, index);
  index = gain.nextIndex;

  const bookValueMinor = computeRakutenEquityBookValueMinor(avgCostMinor, quantity);

  result = {
    row: finishRakutenPasteRow({
      source: "domestic_equity",
      instrumentName,
      ticker,
      accountTypeRaw,
      quantity,
      unitPriceMinor,
      avgCostMinor,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseMutualFundPageBlock(
  lines: string[],
  startIndex: number,
  accountTypeRaw: string,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const instrumentName = lines[startIndex].trim();
  let index = startIndex + 1;

  index = skipAnnotationLines(lines, index);
  const quantity = readNumberAt(lines, index, "投資信託", instrumentName);
  index += 1;

  const avgCostMinor = readNumberAt(lines, index, "投資信託", instrumentName);
  index += 1;

  // 取得総額
  index += 1;

  const unitPriceMinor = readNumberAt(lines, index, "投資信託", instrumentName);
  index += 1;

  // 前日比
  index += 1;

  const marketValueMinor = readNumberAt(lines, index, "投資信託", instrumentName);
  index += 1;

  const gain = readGainRateOrSkip(lines, index);
  index = gain.nextIndex;
  index = skipTotalReturnLine(lines, index);

  let bookValueMinor = marketValueMinor;
  if (Number.isFinite(avgCostMinor) && avgCostMinor > 0) {
    bookValueMinor = computeRakutenMutualFundBookValueMinor(avgCostMinor, quantity);
  }

  result = {
    row: finishRakutenPasteRow({
      source: "mutual_fund",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor,
      avgCostMinor,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseWrapFundPageBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const instrumentName = lines[startIndex].trim();
  let index = startIndex + 1;

  const quantity = readNumberAt(lines, index, "楽ラップ", instrumentName);
  index += 1;

  const avgCostMinor = readNumberAt(lines, index, "楽ラップ", instrumentName);
  index += 1;

  const unitPriceMinor = readNumberAt(lines, index, "楽ラップ", instrumentName);
  index += 1;

  const marketValueMinor = readNumberAt(lines, index, "楽ラップ", instrumentName);
  index += 1;

  // 評価損益（円）
  index += 1;

  const gain = readGainRateOrSkip(lines, index);
  index = gain.nextIndex;

  let bookValueMinor = marketValueMinor;
  if (Number.isFinite(avgCostMinor) && avgCostMinor > 0) {
    bookValueMinor = computeRakutenMutualFundBookValueMinor(avgCostMinor, quantity);
  }

  result = {
    row: finishRakutenPasteRow({
      source: "wrap_fund",
      instrumentName,
      ticker: null,
      accountTypeRaw: "-",
      quantity,
      unitPriceMinor,
      avgCostMinor,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseWrapCashPageBlock(
  lines: string[],
  startIndex: number,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  let index = startIndex + 1;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (trimmed === "" || isRakutenPageNoiseLine(lines[index])) {
      index += 1;
      continue;
    }

    const marketValueMinor = parseRakutenPasteNumber(trimmed);
    if (!Number.isFinite(marketValueMinor)) {
      break;
    }

    result = {
      row: finishRakutenPasteRow({
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
      nextIndex: index + 1,
    };

    let cursor = index + 1;
    while (cursor < lines.length) {
      const trimmed = lines[cursor].trim().normalize("NFKC");
      if (trimmed === "" || isRakutenPageNoiseLine(lines[cursor])) {
        cursor += 1;
        continue;
      }
      if (trimmed === "合計") {
        cursor += 1;
        continue;
      }
      const duplicateValue = parseRakutenPasteNumber(trimmed);
      if (duplicateValue === marketValueMinor) {
        cursor += 1;
        continue;
      }
      break;
    }

    result = { ...result, nextIndex: cursor };
    return result;
  }

  throwPageError("楽ラップ現金等の時価評価額行がありません", startIndex + 1);
}

function parseDomesticBondPageBlock(
  lines: string[],
  startIndex: number,
  accountTypeRaw: string,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const instrumentName = lines[startIndex].trim();
  let index = startIndex + 1;

  // 償還日
  index += 1;
  // FR
  index += 1;

  const quantity = readNumberAt(lines, index, "国内債券", instrumentName);
  index += 1;

  const avgCostMinor = readNumberAt(lines, index, "国内債券", instrumentName);
  index += 1;

  // 参考単価（%）
  index += 1;
  index += 1;

  // 評価損益（円）
  index += 1;

  const gain = readGainRateOrSkip(lines, index);
  index = gain.nextIndex;

  const marketValueMinor = quantity;

  result = {
    row: finishRakutenPasteRow({
      source: "domestic_bond",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor: avgCostMinor,
      avgCostMinor,
      marketValueMinor,
      bookValueMinor: marketValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseFxMmfPageBlock(
  lines: string[],
  startIndex: number,
  accountTypeRaw: string,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const instrumentName = lines[startIndex].trim();
  let index = startIndex + 1;

  // 米ドル
  index += 1;

  const quantity = readNumberAt(lines, index, "外貨建MMF", instrumentName);
  index += 1;

  // USD 未収分配金
  index += 1;

  const avgCostMinor = readNumberAt(lines, index, "外貨建MMF", instrumentName);
  index += 1;

  // 取得総額
  index += 1;

  // 為替レート
  index += 1;

  // 更新日時
  index += 1;

  const marketValueMinor = readNumberAt(lines, index, "外貨建MMF", instrumentName);
  index += 1;

  const gain = readGainRateOrSkip(lines, index);
  index = gain.nextIndex;

  let bookValueMinor = marketValueMinor;
  if (Number.isFinite(avgCostMinor) && avgCostMinor > 0) {
    bookValueMinor = computeRakutenMutualFundBookValueMinor(avgCostMinor, quantity);
  }

  result = {
    row: finishRakutenPasteRow({
      source: "fx_mmf",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor: 0,
      avgCostMinor,
      marketValueMinor,
      bookValueMinor,
      unrealizedGainRate: gain.rate,
    }),
    nextIndex: index,
  };
  return result;
}

function parseMoneyFundPageBlock(
  lines: string[],
  startIndex: number,
  accountTypeRaw: string,
): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result = {
    row: null as unknown as RakutenHoldingPasteRow,
    nextIndex: startIndex + 1,
  };

  const instrumentName = "楽天・マネーファンド";
  let index = startIndex + 1;

  const quantity = readNumberAt(lines, index, "楽天・マネーファンド", instrumentName);
  index += 1;

  const unitPriceMinor = readNumberAt(lines, index, "楽天・マネーファンド", instrumentName);
  index += 1;

  const marketValueMinor = readNumberAt(lines, index, "楽天・マネーファンド", instrumentName);
  index += 1;

  result = {
    row: finishRakutenPasteRow({
      source: "money_fund",
      instrumentName,
      ticker: null,
      accountTypeRaw,
      quantity,
      unitPriceMinor,
      avgCostMinor: 0,
      marketValueMinor,
      bookValueMinor: marketValueMinor,
      unrealizedGainRate: 0,
    }),
    nextIndex: index,
  };
  return result;
}

function isMoneyFundHeaderLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim().normalize("NFKC");

  if (trimmed === "楽天・マネーファンド" || trimmed.startsWith("楽天・マネーファンド")) {
    result = true;
  }

  return result;
}

function isWrapCashHeaderLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (trimmed === "現金等") {
    result = true;
  }

  return result;
}

export function parseRakutenPagePaste(lines: string[]): ParseRakutenPasteResult {
  let result: ParseRakutenPasteResult = { holdings: [] };

  const holdings: RakutenHoldingPasteRow[] = [];
  let currentAccount = "特定";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    const accountSection = parseRakutenPageAccountSection(line);
    if (accountSection !== null) {
      currentAccount = accountSection;
      index += 1;
      continue;
    }

    if (isRakutenPageNoiseLine(line)) {
      index += 1;
      continue;
    }

    if (isWrapCashHeaderLine(line)) {
      const parsed = parseWrapCashPageBlock(lines, index);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    const ticker = extractRakutenLeadingStockCode(line);
    if (ticker !== null) {
      const parsed = parseDomesticEquityPageBlock(lines, index, currentAccount);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    if (isMoneyFundHeaderLine(line)) {
      const parsed = parseMoneyFundPageBlock(lines, index, currentAccount);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    if (isRakutenWrapFundLine(line)) {
      const parsed = parseWrapFundPageBlock(lines, index);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    if (isRakutenDomesticBondLine(line)) {
      const parsed = parseDomesticBondPageBlock(lines, index, currentAccount);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    if (isRakutenFxMmfFundLine(line)) {
      const parsed = parseFxMmfPageBlock(lines, index, currentAccount);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    if (isRakutenPageMutualFundNameLine(line)) {
      const parsed = parseMutualFundPageBlock(lines, index, currentAccount);
      holdings.push(parsed.row);
      index = parsed.nextIndex;
      continue;
    }

    index += 1;
  }

  if (holdings.length === 0) {
    throw new RakutenPasteError(
      "保有明細を1件も読み取れませんでした",
      {
        hint:
          "楽天証券の保有商品一覧画面から、国内株式・投信・楽ラップ等すべてのセクションを含めてコピーしてください。",
      },
    );
  }

  result = { holdings };
  return result;
}

export function parseRakutenPagePasteBlockForTest(params: {
  kind: RakutenPasteProductKind;
  lines: string[];
  index: number;
  accountTypeRaw?: string;
}): { row: RakutenHoldingPasteRow; nextIndex: number } {
  let result: { row: RakutenHoldingPasteRow; nextIndex: number };
  const accountTypeRaw = params.accountTypeRaw ?? "特定";

  if (params.kind === "domestic_equity") {
    result = parseDomesticEquityPageBlock(params.lines, params.index, accountTypeRaw);
    return result;
  }
  if (params.kind === "mutual_fund") {
    result = parseMutualFundPageBlock(params.lines, params.index, accountTypeRaw);
    return result;
  }
  if (params.kind === "wrap_fund") {
    result = parseWrapFundPageBlock(params.lines, params.index);
    return result;
  }
  if (params.kind === "wrap_cash") {
    result = parseWrapCashPageBlock(params.lines, params.index);
    return result;
  }
  if (params.kind === "domestic_bond") {
    result = parseDomesticBondPageBlock(params.lines, params.index, accountTypeRaw);
    return result;
  }
  if (params.kind === "fx_mmf") {
    result = parseFxMmfPageBlock(params.lines, params.index, accountTypeRaw);
    return result;
  }
  result = parseMoneyFundPageBlock(params.lines, params.index, accountTypeRaw);
  return result;
}
