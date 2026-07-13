import { MONEX_ASSET_CLASS_LABEL_MAP } from "./monex-analysis";
import {
  isMonexNoiseLine,
  parseMonexPasteInteger,
  parseMonexPastePercentRate,
} from "./monex-paste-utils";

export type MonexAssetClassPasteRow = {
  valueCode: string;
  valueName: string;
  instrumentName: string;
  holdingRatio: number;
  marketValueMinor: number;
};

export type ParseMonexAssetClassPasteResult = {
  rows: MonexAssetClassPasteRow[];
};

function isAssetClassHeaderLine(line: string): boolean {
  let result = false;

  if (
    line === "銘柄" ||
    line === "▼" ||
    line === "保有比率" ||
    line === "評価額" ||
    line === "評価額前日比" ||
    line === "評価損益"
  ) {
    result = true;
  }

  return result;
}

function isAssetClassTotalLine(line: string): boolean {
  let result = false;
  if (Object.prototype.hasOwnProperty.call(MONEX_ASSET_CLASS_LABEL_MAP, line.trim())) {
    result = true;
  }
  return result;
}

function skipAssetClassSummary(lines: string[], startIndex: number): number {
  let result = startIndex;

  while (result < lines.length) {
    const line = lines[result];
    if (isAssetClassHeaderLine(line) || isMonexNoiseLine(line)) {
      result += 1;
      continue;
    }
    if (isAssetClassTotalLine(line)) {
      break;
    }
    if (line.includes("%") || line.includes("％") || line === "---" || line.startsWith("(")) {
      result += 1;
      continue;
    }
    const asInt = parseMonexPasteInteger(line);
    if (Number.isFinite(asInt) || line === "---") {
      result += 1;
      continue;
    }
    break;
  }

  return result;
}

function skipInstrumentTrailingMeta(lines: string[], startIndex: number): number {
  let result = startIndex;

  while (result < lines.length) {
    const line = lines[result];
    if (
      line === "---" ||
      line.startsWith("(") ||
      line === "0" ||
      /^\(?[+\-]?\d/.test(line)
    ) {
      const looksLikeName =
        !line.includes("%") &&
        !line.includes("％") &&
        !line.startsWith("(") &&
        line !== "---" &&
        line !== "0" &&
        !/^[+\-]?\d/.test(line.replace(/,/g, ""));
      if (looksLikeName && !Number.isFinite(parseMonexPasteInteger(line))) {
        break;
      }
      if (isAssetClassTotalLine(line) || isAssetClassHeaderLine(line)) {
        break;
      }
      result += 1;
      continue;
    }
    break;
  }

  return result;
}

export function parseMonexAssetClassPaste(lines: string[]): ParseMonexAssetClassPasteResult {
  let result: ParseMonexAssetClassPasteResult = { rows: [] };
  const rowsByClass = new Map<string, MonexAssetClassPasteRow[]>();

  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (isAssetClassHeaderLine(line) || isMonexNoiseLine(line)) {
      index += 1;
      continue;
    }

    if (!isAssetClassTotalLine(line)) {
      index += 1;
      continue;
    }

    const label = line.trim();
    const assetClass = MONEX_ASSET_CLASS_LABEL_MAP[label];
    index += 1;
    index = skipAssetClassSummary(lines, index);

    const classRows: MonexAssetClassPasteRow[] = [];
    while (index < lines.length) {
      const instrumentLine = lines[index];
      if (isAssetClassHeaderLine(instrumentLine) || isMonexNoiseLine(instrumentLine)) {
        index += 1;
        continue;
      }
      if (isAssetClassTotalLine(instrumentLine)) {
        break;
      }

      const instrumentName = instrumentLine.trim();
      index += 1;

      if (index >= lines.length) {
        break;
      }

      const holdingRatio = parseMonexPastePercentRate(lines[index]);
      index += 1;

      if (index >= lines.length) {
        break;
      }

      const marketValueMinor = parseMonexPasteInteger(lines[index]);
      index += 1;
      index = skipInstrumentTrailingMeta(lines, index);

      if (
        instrumentName === "" ||
        !Number.isFinite(holdingRatio) ||
        !Number.isFinite(marketValueMinor) ||
        marketValueMinor <= 0
      ) {
        continue;
      }

      classRows.push({
        valueCode: assetClass.code,
        valueName: assetClass.name,
        instrumentName,
        holdingRatio,
        marketValueMinor,
      });
    }

    rowsByClass.set(assetClass.code, classRows);
  }

  for (const classRows of rowsByClass.values()) {
    for (const row of classRows) {
      result.rows.push(row);
    }
  }

  return result;
}
