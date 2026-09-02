import { stripUtf8Bom } from "./ideco-csv-utils";
import { RakutenPasteError } from "./rakuten-csv-utils";

export { RakutenPasteError };

export type RakutenPasteProductKind =
  | "domestic_equity"
  | "mutual_fund"
  | "money_fund"
  | "fx_mmf"
  | "domestic_bond"
  | "wrap_fund"
  | "wrap_cash";

export function splitRakutenPasteLines(content: string): string[] {
  let result: string[] = [];

  const normalized = stripUtf8Bom(content).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n");
  for (const line of rawLines) {
    if (line.trim() === "") {
      continue;
    }
    result.push(line.trimEnd());
  }

  return result;
}

export function splitRakutenPasteCells(line: string): string[] {
  let result = line.split("\t").map((cell) => cell.trim());
  return result;
}

export function isRakutenHeaderLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (
    trimmed.startsWith("種別") ||
    trimmed.startsWith("前日比") ||
    trimmed.startsWith("時価評価額") ||
    trimmed.includes("評価損益")
  ) {
    result = true;
  }

  return result;
}

export function isRakutenAccountTypeLabel(value: string): boolean {
  let result = false;
  const normalized = value.trim().normalize("NFKC").replace(/\s+/g, "");

  if (
    normalized === "特定" ||
    normalized === "一般" ||
    normalized === "-" ||
    normalized.includes("NISA") ||
    normalized.includes("つみたて")
  ) {
    result = true;
  }

  return result;
}

/** 円・口・株・カンマ等を除去して整数円（または口数）に丸める。欠損は NaN。 */
export function parseRakutenPasteNumber(value: string): number {
  let result = Number.NaN;

  const normalized = value
    .trim()
    .normalize("NFKC")
    .replace(/円\/USD/gi, "")
    .replace(/円/g, "")
    .replace(/口/g, "")
    .replace(/株/g, "")
    .replace(/％/g, "")
    .replace(/%/g, "")
    .replace(/,/g, "")
    .replace(/^\+/, "")
    .trim();

  if (normalized === "" || normalized === "-" || normalized === "---") {
    return result;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return result;
  }

  result = Math.round(parsed);
  return result;
}

export function parseRakutenPastePercentRate(value: string): number {
  let result = Number.NaN;

  const trimmed = value.trim().normalize("NFKC");
  let withoutSuffix = trimmed;
  if (trimmed.endsWith("%") || trimmed.endsWith("％")) {
    withoutSuffix = trimmed.slice(0, -1).trim();
  }

  const cell = withoutSuffix.split("\t")[0].trim();
  const normalized = cell.replace(/,/g, "").replace(/^\+/, "");
  if (normalized === "" || normalized === "-" || normalized.startsWith("---")) {
    return result;
  }

  const percent = Number.parseFloat(normalized);
  if (!Number.isFinite(percent)) {
    return result;
  }

  result = percent / 100;
  return result;
}

export function finiteOrZero(value: number): number {
  let result = 0;
  if (Number.isFinite(value)) {
    result = value;
  }
  return result;
}

export function isRakutenStockCode(value: string): boolean {
  let result = false;
  const normalized = value.trim().normalize("NFKC");
  if (/^[0-9]{3,4}[A-Za-z0-9]?$/u.test(normalized)) {
    result = true;
  }
  return result;
}

export function extractRakutenLeadingStockCode(line: string): string | null {
  let result: string | null = null;
  const cells = splitRakutenPasteCells(line);
  const first = cells[0].trim().normalize("NFKC");

  if (!isRakutenStockCode(first)) {
    return result;
  }

  result = first;
  return result;
}

export type RakutenPasteFormat = "legacy" | "page";

export function detectRakutenPasteFormat(lines: string[]): RakutenPasteFormat {
  let hasLegacy = false;
  let hasPage = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("種別\t") || trimmed.startsWith("種別 ")) {
      hasLegacy = true;
      continue;
    }

    const cells = splitRakutenPasteCells(line);
    const first = cells[0].trim().normalize("NFKC");

    if (first === "国内株式" && isRakutenStockCode(cells[1] ?? "")) {
      hasLegacy = true;
      continue;
    }

    if (
      first === "投資信託" &&
      (cells[1] ?? "").trim() !== "" &&
      isRakutenAccountTypeLabel(cells[2] ?? "")
    ) {
      hasLegacy = true;
      continue;
    }

    if (first === "国内債券" && (cells[1] ?? "").trim() !== "") {
      hasLegacy = true;
      continue;
    }

    if (
      (first === "楽天・マネーファンド" || first.startsWith("楽天・マネーファンド")) &&
      (cells[1] ?? "").trim() !== "" &&
      isRakutenAccountTypeLabel(cells[2] ?? "")
    ) {
      hasLegacy = true;
      continue;
    }

    if (first === "外貨建" || first === "楽ラップ") {
      hasLegacy = true;
      continue;
    }

    if (first === "MMF" && (cells[1] ?? "").trim() !== "") {
      hasLegacy = true;
      continue;
    }

    if (parseRakutenPageAccountSection(line) !== null) {
      hasPage = true;
      continue;
    }

    if (extractRakutenLeadingStockCode(line) !== null) {
      hasPage = true;
      continue;
    }

    if (isRakutenWrapFundLine(line)) {
      hasPage = true;
      continue;
    }
  }

  let result: RakutenPasteFormat = "legacy";
  if (hasPage && !hasLegacy) {
    result = "page";
  }
  return result;
}

export function parseRakutenPageAccountSection(line: string): string | null {
  let result: string | null = null;
  const normalized = line.trim().normalize("NFKC").replace(/\s+/g, "");

  if (normalized === "特定口座") {
    result = "特定";
    return result;
  }

  if (normalized === "一般口座") {
    result = "一般";
    return result;
  }

  return result;
}

export function isRakutenPageNoiseLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();
  const normalized = trimmed.normalize("NFKC");

  if (trimmed === "") {
    result = true;
    return result;
  }

  const exactNoise = new Set([
    "詳細",
    "買い",
    "売り",
    "積立",
    "買い 売却",
    "買い 解約",
    "追加 引き出し",
    "注文",
    "銘柄",
    "ファンド",
    "デフォルト",
    "取引",
    "登録",
    "制限",
    "あし",
    "あと",
    "すべて",
    "国内株式",
    "投信",
    "米国株式",
    "中国株式",
    "アセアン株式",
    "債券",
    "外貨預り金",
    "金・プラチナ",
    "楽ラップ",
    "投資信託",
    "国内債券",
    "外貨建MMF",
    "特定口座合計",
    "決算発表日",
    "再投資型",
    "分配金",
    "コース",
    "(変更)",
    "(執行中)",
    "円%",
    "FR",
    "合計",
    "現金等［円］",
    "↓特定口座",
    "↓一般口座",
    "口座合計を表示",
    "口座合計をすべて非表示",
    "貸株金利を表示",
    "銘柄の登録・比較ボタンを表示",
    "ファンドの登録・比較ボタンを表示",
    "ファンドの登録ボタンを表示",
  ]);

  if (exactNoise.has(normalized)) {
    result = true;
    return result;
  }

  if (
    normalized.startsWith("平均取得") ||
    normalized.startsWith("取得総額") ||
    normalized.startsWith("保有数量") ||
    normalized.startsWith("現在値") ||
    normalized.startsWith("前日比") ||
    normalized.startsWith("時価評価額") ||
    normalized.startsWith("評価損益") ||
    normalized.startsWith("基準価額") ||
    normalized.startsWith("未収分配金") ||
    normalized.startsWith("参考為替レート") ||
    normalized.startsWith("償還日") ||
    normalized.startsWith("年利率") ||
    normalized.startsWith("評価額") ||
    normalized.startsWith("参考単価") ||
    normalized.startsWith("損益率") ||
    normalized.startsWith("ファンド名") ||
    normalized.startsWith("トータル") ||
    normalized.startsWith("リターン") ||
    normalized.includes("円 / USD") ||
    /^\(\d{2}\/\d{2}/.test(normalized) ||
    /^\d{4}\/\d{2}\/\d{2}$/.test(normalized)
  ) {
    result = true;
    return result;
  }

  if (/^[\d,.+\-]+\s*USD$/i.test(normalized)) {
    result = true;
    return result;
  }

  if (normalized === "米ドル") {
    result = true;
    return result;
  }

  if (normalized.startsWith("現金等［") || normalized.startsWith("現金等[")) {
    result = true;
    return result;
  }

  return result;
}

export function isRakutenWrapFundLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (trimmed.startsWith("【楽ラップ専用】")) {
    result = true;
  }

  return result;
}

export function isRakutenDomesticBondLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (trimmed.startsWith("個人国債")) {
    result = true;
  }

  return result;
}

export function isRakutenPageMutualFundNameLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (trimmed === "" || isRakutenPageNoiseLine(line)) {
    return result;
  }

  if (extractRakutenLeadingStockCode(line) !== null) {
    return result;
  }

  if (isRakutenWrapFundLine(line) || isRakutenDomesticBondLine(line)) {
    return result;
  }

  if (trimmed === "楽天・マネーファンド" || trimmed.startsWith("楽天・マネーファンド")) {
    return result;
  }

  if (trimmed === "現金等" || trimmed.startsWith("現金等")) {
    return result;
  }

  if (
    trimmed.includes("ファンド") ||
    trimmed.includes("オープン") ||
    trimmed.includes("ウェルスナビ") ||
    trimmed.includes("Tracers") ||
    trimmed.includes("インベスコ") ||
    trimmed.includes("SMT ")
  ) {
    result = true;
  }

  return result;
}

export function isRakutenFxMmfFundLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (trimmed.includes("MMF") && trimmed.includes("ファンド")) {
    result = true;
  }

  return result;
}

export function detectRakutenBlockKind(
  lines: string[],
  index: number,
): RakutenPasteProductKind | null {
  let result: RakutenPasteProductKind | null = null;
  const line = lines[index];
  const cells = splitRakutenPasteCells(line);
  const first = cells[0].trim().normalize("NFKC");

  if (first === "国内株式") {
    if (isRakutenStockCode(cells[1] ?? "")) {
      result = "domestic_equity";
    }
    return result;
  }

  if (first === "投資信託") {
    const instrumentName = (cells[1] ?? "").trim();
    const accountTypeRaw = cells[2] ?? "";
    if (instrumentName !== "" && isRakutenAccountTypeLabel(accountTypeRaw)) {
      result = "mutual_fund";
    }
    return result;
  }

  if (first === "楽天・マネーファンド" || first.startsWith("楽天・マネーファンド")) {
    const instrumentName = (cells[1] ?? "").trim();
    const accountTypeRaw = cells[2] ?? "";
    if (instrumentName !== "" && isRakutenAccountTypeLabel(accountTypeRaw)) {
      result = "money_fund";
    }
    return result;
  }

  if (first === "外貨建") {
    result = "fx_mmf";
    return result;
  }

  if (first === "MMF" && index > 0) {
    const prev = splitRakutenPasteCells(lines[index - 1])[0]?.trim().normalize("NFKC");
    if (prev === "外貨建") {
      result = "fx_mmf";
    }
    return result;
  }

  if (first === "国内債券") {
    const instrumentName = (cells[1] ?? "").trim();
    if (instrumentName !== "") {
      result = "domestic_bond";
    }
    return result;
  }

  if (first === "楽ラップ") {
    const nextLine = index + 1 < lines.length ? lines[index + 1].trim() : "";
    if (nextLine === "現金等" || nextLine.startsWith("現金等")) {
      result = "wrap_cash";
      return result;
    }
    result = "wrap_fund";
    return result;
  }

  return result;
}
