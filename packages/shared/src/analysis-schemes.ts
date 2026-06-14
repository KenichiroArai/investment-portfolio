import type {
  AnalysisSchemeConfig,
  ClassificationTagDto,
  CurrentSnapshotDto,
  HoldingLineDto,
} from "./types";

export type { AnalysisSchemeConfig };

export function listAnalysisSchemesForPortfolio(
  kind: string,
): AnalysisSchemeConfig[] {
  let result: AnalysisSchemeConfig[] = [];

  if (kind !== "ideco") {
    return result;
  }

  return result;
}

export function resolveAnalysisSchemes(
  snapshot: Pick<CurrentSnapshotDto, "analysisSchemes" | "lines">,
  portfolioKind: string,
): AnalysisSchemeConfig[] {
  let result: AnalysisSchemeConfig[] = [];

  const configuredSchemes =
    snapshot.analysisSchemes.length > 0
      ? snapshot.analysisSchemes
      : listAnalysisSchemesForPortfolio(portfolioKind);

  result = collectHoldingsClassificationSchemes(configuredSchemes, snapshot.lines);
  return result;
}

export function mergeAnalysisSchemesFromSnapshots(
  snapshots: CurrentSnapshotDto[],
): AnalysisSchemeConfig[] {
  let result: AnalysisSchemeConfig[] = [];
  const seen = new Set<string>();

  for (const snapshot of snapshots) {
    for (const scheme of snapshot.analysisSchemes) {
      if (seen.has(scheme.schemeCode)) {
        continue;
      }
      seen.add(scheme.schemeCode);
      result.push(scheme);
    }
  }

  return result;
}

export function findClassificationTagValue(
  tags: ClassificationTagDto[],
  schemeCode: string,
): string | null {
  let result: string | null = null;

  const tag = tags.find((item) => item.schemeCode === schemeCode);
  if (!tag) {
    return result;
  }

  result = tag.valueName;
  return result;
}

export function findClassificationTagValueCode(
  tags: ClassificationTagDto[],
  schemeCode: string,
): string | null {
  let result: string | null = null;

  const tag = tags.find((item) => item.schemeCode === schemeCode);
  if (!tag) {
    return result;
  }

  result = tag.valueCode;
  return result;
}

function compareHoldingsLinesBySortOrder(
  left: HoldingLineDto,
  right: HoldingLineDto,
): number {
  let result = 0;
  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    result = leftOrder - rightOrder;
    return result;
  }
  return result;
}

export function collectHoldingsClassificationSchemes(
  analysisSchemes: AnalysisSchemeConfig[],
  lines: HoldingLineDto[],
): AnalysisSchemeConfig[] {
  let result: AnalysisSchemeConfig[] = [];
  const seen = new Set<string>();

  for (const scheme of analysisSchemes) {
    if (seen.has(scheme.schemeCode)) {
      continue;
    }
    seen.add(scheme.schemeCode);
    result.push(scheme);
  }

  const sortedLines = [...lines].sort(compareHoldingsLinesBySortOrder);

  for (const line of sortedLines) {
    for (const tag of line.tags) {
      if (seen.has(tag.schemeCode)) {
        continue;
      }
      seen.add(tag.schemeCode);
      result.push({
        schemeCode: tag.schemeCode,
        schemeName: tag.schemeName,
      });
    }
  }

  return result;
}

export const __analysisSchemesTesting = {
  compareHoldingsLinesBySortOrder,
};
