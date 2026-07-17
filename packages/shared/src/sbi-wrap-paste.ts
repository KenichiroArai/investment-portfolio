import {
  buildSbiWrapAccountId,
  buildSbiWrapAccountName,
  type SbiWrapProductCode,
} from "./sbi-wrap-analysis";
import {
  isSbiWrapAssetBalanceHeader,
  isSbiWrapCashLabel,
  isSbiWrapSkipFund,
  parseSbiWrapAsOfDate,
  parseSbiWrapYenAmount,
  SbiWrapPasteError,
  splitSbiWrapPasteLines,
} from "./sbi-wrap-paste-utils";

export type SbiWrapHoldingSource = "wrap_fund" | "wrap_cash";

export type SbiWrapHoldingPasteRow = {
  source: SbiWrapHoldingSource;
  productCode: SbiWrapProductCode;
  productName: string;
  instrumentName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
  weight: number | null;
};

export type ParseSbiWrapPasteResult = {
  asOfDate: string | null;
  holdings: SbiWrapHoldingPasteRow[];
};

type ParsedHoldingEntry = {
  instrumentName: string;
  marketValueMinor: number;
  weight: number | null;
  isCash: boolean;
};

type ParsedProductBlock = {
  asOfDate: string | null;
  entries: ParsedHoldingEntry[];
};

function findBlockStarts(lines: string[]): number[] {
  let result: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (isSbiWrapAssetBalanceHeader(lines[index])) {
      result.push(index);
    }
  }

  return result;
}

function parseWeightPercent(raw: string): number | null {
  let result: number | null = null;
  const normalized = raw.replace(/\s+/g, "").trim();

  if (normalized === "--%" || normalized === "-%" || normalized === "--") {
    return result;
  }

  const match = /^([+-]?\d+(?:\.\d+)?)%$/.exec(normalized);
  if (!match) {
    return result;
  }

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) {
    return result;
  }

  result = value / 100;
  return result;
}

function findUchiwakeIndex(lines: string[]): number {
  let result = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === "内訳") {
      result = index;
      return result;
    }
  }

  return result;
}

function parseProductBlock(lines: string[]): ParsedProductBlock {
  let result: ParsedProductBlock = { asOfDate: null, entries: [] };

  if (lines.length === 0) {
    return result;
  }

  for (const line of lines) {
    const asOfDate = parseSbiWrapAsOfDate(line);
    if (asOfDate) {
      result = { ...result, asOfDate };
      break;
    }
  }

  const uchiIndex = findUchiwakeIndex(lines);
  if (uchiIndex === -1) {
    throw new SbiWrapPasteError("「内訳」が見つかりません");
  }

  const entries: ParsedHoldingEntry[] = [];
  let index = uchiIndex + 1;

  while (index < lines.length) {
    if (isSbiWrapAssetBalanceHeader(lines[index])) {
      break;
    }

    const instrumentName = lines[index];
    if (
      instrumentName === "評価額" ||
      instrumentName === "比率" ||
      instrumentName === "資産構成" ||
      instrumentName === "資産構成比率" ||
      instrumentName === "購入" ||
      instrumentName === "積立" ||
      instrumentName === "資産推移" ||
      instrumentName === "資産推移情報を読み込む"
    ) {
      index += 1;
      continue;
    }

    if (index + 1 >= lines.length) {
      break;
    }

    // 現金: 銘柄名 / 金額 / 比率 / 比率値（「評価額」ラベル無し）
    if (isSbiWrapCashLabel(instrumentName)) {
      if (index + 3 >= lines.length) {
        throw new SbiWrapPasteError("現金の評価額・比率が不足しています");
      }

      const marketValueMinor = parseSbiWrapYenAmount(lines[index + 1]);
      if (marketValueMinor === null) {
        throw new SbiWrapPasteError(`現金の評価額が不正です: ${lines[index + 1]}`);
      }
      if (lines[index + 2] !== "比率") {
        throw new SbiWrapPasteError("現金の比率ラベルがありません");
      }

      const weight = parseWeightPercent(lines[index + 3]);
      entries.push({
        instrumentName,
        marketValueMinor,
        weight,
        isCash: true,
      });
      index += 4;
      continue;
    }

    // ファンド: 銘柄名 / 評価額 / 金額 / 比率 / 比率値
    if (lines[index + 1] !== "評価額") {
      index += 1;
      continue;
    }

    if (index + 4 >= lines.length) {
      throw new SbiWrapPasteError(`「${instrumentName}」の評価額・比率が不足しています`);
    }

    const marketValueMinor = parseSbiWrapYenAmount(lines[index + 2]);
    if (marketValueMinor === null) {
      throw new SbiWrapPasteError(
        `「${instrumentName}」の評価額が不正です: ${lines[index + 2]}`,
      );
    }

    if (lines[index + 3] !== "比率") {
      throw new SbiWrapPasteError(`「${instrumentName}」の比率ラベルがありません`);
    }

    const weight = parseWeightPercent(lines[index + 4]);
    entries.push({
      instrumentName,
      marketValueMinor,
      weight,
      isCash: false,
    });
    index += 5;
  }

  result = { asOfDate: result.asOfDate, entries };
  return result;
}

function detectProductCode(entries: ParsedHoldingEntry[]): SbiWrapProductCode {
  let result: SbiWrapProductCode | null = null;

  const names = entries.map((entry) => entry.instrumentName);
  const joined = names.join("\n");

  if (joined.includes("（ラップ専用）ＳＢＩ・") || joined.includes("(ラップ専用)SBI・")) {
    result = "ai_investment";
    return result;
  }

  if (joined.includes("三井住友ＤＳ") || joined.includes("三井住友DS")) {
    result = "all_equity";
    return result;
  }

  if (
    joined.includes("世界株式アクティブ") ||
    joined.includes("セレクト・オポチュニティ") ||
    joined.includes("グローバルＲＥＩＴ") ||
    joined.includes("Ｊ−ＲＥＩＴ")
  ) {
    result = "takumi";
    return result;
  }

  if (joined.includes("マルチアセット")) {
    let tripleValue = 0;
    let singleValue = 0;

    for (const entry of entries) {
      if (entry.instrumentName.includes("トリプル")) {
        tripleValue = entry.marketValueMinor;
      }
      if (entry.instrumentName.includes("シングル")) {
        singleValue = entry.marketValueMinor;
      }
    }

    if (tripleValue > singleValue) {
      result = "reba_choice";
      return result;
    }

    result = "rebanavi";
    return result;
  }

  throw new SbiWrapPasteError(
    `商品を判定できませんでした（銘柄: ${names.slice(0, 3).join(" / ")}）`,
  );
}

function productNameFromCode(code: SbiWrapProductCode): string {
  let result = "不明";

  if (code === "ai_investment") {
    result = "AI投資";
    return result;
  }
  if (code === "takumi") {
    result = "匠の運用";
    return result;
  }
  if (code === "rebanavi") {
    result = "レバナビ";
    return result;
  }
  if (code === "reba_choice") {
    result = "レバチョイス";
    return result;
  }
  if (code === "all_equity") {
    result = "ALL株式";
  }

  return result;
}

function toHoldingRows(block: ParsedProductBlock): SbiWrapHoldingPasteRow[] {
  let result: SbiWrapHoldingPasteRow[] = [];
  const productCode = detectProductCode(block.entries);
  const productName = productNameFromCode(productCode);
  const accountId = buildSbiWrapAccountId(productName);
  const accountName = buildSbiWrapAccountName(productName);

  for (const entry of block.entries) {
    if (isSbiWrapSkipFund(entry.instrumentName, entry.marketValueMinor)) {
      continue;
    }

    result.push({
      source: entry.isCash ? "wrap_cash" : "wrap_fund",
      productCode,
      productName,
      instrumentName: entry.instrumentName,
      accountId,
      accountName,
      accountType: productName,
      quantity: 1,
      marketValueMinor: entry.marketValueMinor,
      bookValueMinor: null,
      weight: entry.weight,
    });
  }

  return result;
}

export function parseSbiWrapPaste(content: string): ParseSbiWrapPasteResult {
  let result: ParseSbiWrapPasteResult = { asOfDate: null, holdings: [] };

  const lines = splitSbiWrapPasteLines(content);
  if (lines.length === 0) {
    throw new SbiWrapPasteError("貼り付け内容が空です");
  }

  const starts = findBlockStarts(lines);
  if (starts.length === 0) {
    throw new SbiWrapPasteError("「資産残高」ブロックが見つかりません");
  }

  const holdings: SbiWrapHoldingPasteRow[] = [];
  let asOfDate: string | null = null;
  const seenProducts = new Set<SbiWrapProductCode>();

  for (let startIndex = 0; startIndex < starts.length; startIndex += 1) {
    const start = starts[startIndex];
    const end =
      startIndex + 1 < starts.length ? starts[startIndex + 1] : lines.length;
    const blockLines = lines.slice(start, end);
    const block = parseProductBlock(blockLines);

    if (block.asOfDate && !asOfDate) {
      asOfDate = block.asOfDate;
    }

    const rows = toHoldingRows(block);
    if (rows.length === 0) {
      throw new SbiWrapPasteError("保有明細を1件も読み取れませんでした");
    }

    const productCode = rows[0].productCode;
    if (seenProducts.has(productCode)) {
      throw new SbiWrapPasteError(
        `商品「${rows[0].productName}」が複数回含まれています`,
      );
    }
    seenProducts.add(productCode);
    holdings.push(...rows);
  }

  if (holdings.length === 0) {
    throw new SbiWrapPasteError("保有明細を1件も読み取れませんでした");
  }

  result = { asOfDate, holdings };
  return result;
}
