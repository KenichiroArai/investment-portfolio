import { buildMonexInstrumentAssetClassBreakdownFromMarketValues } from "./monex-asset-class-csv";
import type { MonexInstrumentAssetClassBreakdownEntry } from "./monex-asset-class-csv";
import { parseMonexAssetClassPaste } from "./monex-asset-class-paste";
import { parseMonexCompassFundPaste } from "./monex-compass-fund-paste";
import type { MonexCompassFundPasteRow } from "./monex-compass-fund-paste";
import { parseMonexDomesticHoldingsPaste } from "./monex-domestic-holdings-paste";
import type { MonexDomesticHoldingsPasteRow } from "./monex-domestic-holdings-paste";
import {
  detectMonexPasteSectionKind,
  MonexCsvError,
  splitMonexPasteLines,
  type MonexPasteSectionKind,
} from "./monex-paste-utils";
import { parseMonexUsStocksPaste } from "./monex-us-stocks-paste";
import type { MonexUsStockPasteRow } from "./monex-us-stocks-paste";

export type MonexHoldingPasteRow =
  | MonexDomesticHoldingsPasteRow
  | MonexUsStockPasteRow
  | MonexCompassFundPasteRow;

export type ParseMonexPasteResult = {
  holdings: MonexHoldingPasteRow[];
  assetClassBreakdownByInstrumentName: Map<
    string,
    MonexInstrumentAssetClassBreakdownEntry[]
  >;
};

type PasteSection = {
  kind: MonexPasteSectionKind;
  lines: string[];
};

function isSectionHeaderStart(lines: string[], index: number): boolean {
  let result = false;
  const line = lines[index];
  const window = lines.slice(index, Math.min(lines.length, index + 12));
  const kind = detectMonexPasteSectionKind(window);

  if (kind === "unknown") {
    return result;
  }

  if (kind === "asset_class") {
    if (line === "銘柄" || line === "保有比率" || line.endsWith("全体")) {
      result = true;
    }
    return result;
  }

  if (kind === "us") {
    if (
      line.includes("保有株数") ||
      line.includes("概算簿価単価") ||
      (line.includes("銘柄") && line.includes("市場"))
    ) {
      result = true;
    }
    return result;
  }

  if (kind === "compass") {
    if (
      line.includes("発注数") ||
      line.includes("ファンド名") ||
      (line === "投資信託" &&
        index + 1 < lines.length &&
        lines[index + 1].includes("ファンド名"))
    ) {
      result = true;
    }
    return result;
  }

  if (kind === "domestic") {
    if (
      (line.includes("保有数（口）") || line.includes("保有数(口)")) &&
      !window.some((item) => item.includes("発注数"))
    ) {
      result = true;
      return result;
    }
    if (
      line.includes("基準価額") &&
      window.some((item) => item.includes("保有数")) &&
      !window.some((item) => item.includes("発注数")) &&
      !window.some((item) => item.includes("保有株数"))
    ) {
      result = true;
    }
  }

  return result;
}

function splitMonexPasteSections(lines: string[]): PasteSection[] {
  let result: PasteSection[] = [];
  const starts: number[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (isSectionHeaderStart(lines, index)) {
      starts.push(index);
    }
  }

  if (starts.length === 0) {
    const kind = detectMonexPasteSectionKind(lines);
    result.push({ kind, lines });
    return result;
  }

  if (starts[0] > 0) {
    const leading = lines.slice(0, starts[0]);
    const kind = detectMonexPasteSectionKind(leading);
    if (kind !== "unknown") {
      result.push({ kind, lines: leading });
    }
  }

  for (let startIndex = 0; startIndex < starts.length; startIndex += 1) {
    const from = starts[startIndex];
    const to = startIndex + 1 < starts.length ? starts[startIndex + 1] : lines.length;
    const sectionLines = lines.slice(from, to);
    const kind = detectMonexPasteSectionKind(sectionLines);
    result.push({ kind, lines: sectionLines });
  }

  return result;
}

export function parseMonexPaste(content: string): ParseMonexPasteResult {
  let result: ParseMonexPasteResult = {
    holdings: [],
    assetClassBreakdownByInstrumentName: new Map(),
  };

  const normalized = content.trim();
  if (normalized === "") {
    throw new MonexCsvError("貼り付けデータが空です");
  }

  // normalized は非空のため splitMonexPasteLines は必ず1行以上を返す
  const lines = splitMonexPasteLines(normalized);
  const sections = splitMonexPasteSections(lines);
  const holdings: MonexHoldingPasteRow[] = [];
  const assetClassLines: string[] = [];

  for (const section of sections) {
    if (section.kind === "domestic") {
      const parsed = parseMonexDomesticHoldingsPaste(section.lines);
      for (const row of parsed.rows) {
        holdings.push(row);
      }
      continue;
    }

    if (section.kind === "us") {
      const parsed = parseMonexUsStocksPaste(section.lines);
      for (const row of parsed.rows) {
        holdings.push(row);
      }
      continue;
    }

    if (section.kind === "compass") {
      const parsed = parseMonexCompassFundPaste(section.lines);
      for (const row of parsed.rows) {
        holdings.push(row);
      }
      continue;
    }

    if (section.kind === "asset_class") {
      for (const line of section.lines) {
        assetClassLines.push(line);
      }
    }
  }

  if (holdings.length === 0) {
    throw new MonexCsvError("貼り付けデータに保有明細がありません");
  }

  const assetClassParsed = parseMonexAssetClassPaste(assetClassLines);
  const assetClassRows = assetClassParsed.rows.map((row) => ({
    instrumentName: row.instrumentName,
    valueCode: row.valueCode,
    marketValueMinor: row.marketValueMinor,
  }));

  result = {
    holdings,
    assetClassBreakdownByInstrumentName:
      buildMonexInstrumentAssetClassBreakdownFromMarketValues(assetClassRows),
  };

  return result;
}
