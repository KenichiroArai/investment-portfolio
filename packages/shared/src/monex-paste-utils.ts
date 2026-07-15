import { stripUtf8Bom } from "./ideco-csv-utils";
import { MonexCsvError } from "./monex-csv-utils";

export { MonexCsvError };

export function splitMonexPasteLines(content: string): string[] {
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

export function splitMonexPasteCells(line: string): string[] {
  let result = line.split("\t").map((cell) => cell.trim());
  return result;
}

export function parseMonexPasteInteger(value: string): number {
  let result = Number.NaN;

  const normalized = value
    .trim()
    .replace(/円/g, "")
    .replace(/口/g, "")
    .replace(/,/g, "")
    .replace(/^\+/, "")
    .trim();
  if (normalized === "" || normalized === "-" || normalized === "---") {
    return result;
  }

  result = Number.parseInt(normalized, 10);
  return result;
}

export function parseMonexPastePercentRate(value: string): number {
  let result = Number.NaN;

  const trimmed = value.trim();
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

export function isMonexAccountTypeLabel(value: string): boolean {
  let result = false;
  const normalized = value.trim().normalize("NFKC").replace(/\s+/g, "");

  if (
    normalized === "特定" ||
    normalized === "一般" ||
    normalized.includes("NISA") ||
    normalized.includes("つみたて")
  ) {
    result = true;
  }

  return result;
}

export function isMonexNoiseLine(line: string): boolean {
  let result = false;
  const trimmed = line.trim();

  if (
    trimmed === "乗換" ||
    trimmed === "買付" ||
    trimmed === "売却" ||
    trimmed === "取引" ||
    trimmed === "投資信託" ||
    trimmed === "クリア" ||
    trimmed.startsWith("絞り込み") ||
    trimmed.startsWith("並べ替え") ||
    trimmed === "すべて 特定 一般" ||
    trimmed.startsWith("すべて ")
  ) {
    result = true;
  }

  return result;
}

export type MonexPasteSectionKind =
  | "domestic"
  | "us"
  | "compass"
  | "asset_class"
  | "unknown";

export function detectMonexPasteSectionKind(lines: string[]): MonexPasteSectionKind {
  let result: MonexPasteSectionKind = "unknown";
  const joined = lines.join("\n");

  if (joined.includes("保有比率") && (joined.includes("▼") || /全体/.test(joined))) {
    result = "asset_class";
    return result;
  }

  if (joined.includes("発注数") || (joined.includes("ファンド名") && joined.includes("分配金"))) {
    result = "compass";
    return result;
  }

  if (joined.includes("保有株数") || joined.includes("概算簿価単価")) {
    result = "us";
    return result;
  }

  if (
    joined.includes("保有数（口）") ||
    joined.includes("保有数(口)") ||
    (joined.includes("平均取得単価") && joined.includes("基準価額"))
  ) {
    result = "domestic";
    return result;
  }

  return result;
}
