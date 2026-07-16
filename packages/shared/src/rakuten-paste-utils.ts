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

export function isRakutenStockCode(value: string): boolean {
  let result = false;
  const normalized = value.trim().normalize("NFKC");
  if (/^[0-9]{3,4}[A-Za-z0-9]?$/u.test(normalized)) {
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
  const first = (cells[0] ?? "").trim().normalize("NFKC");

  if (first === "国内株式") {
    result = "domestic_equity";
    return result;
  }

  if (first === "投資信託") {
    result = "mutual_fund";
    return result;
  }

  if (first === "楽天・マネーファンド" || first.startsWith("楽天・マネーファンド")) {
    result = "money_fund";
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
    result = "domestic_bond";
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
