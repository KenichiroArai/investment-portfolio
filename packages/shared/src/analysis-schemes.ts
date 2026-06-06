import type { AnalysisSchemeConfig, CurrentSnapshotDto } from "./types";

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
  snapshot: Pick<CurrentSnapshotDto, "analysisSchemes">,
  portfolioKind: string,
): AnalysisSchemeConfig[] {
  let result: AnalysisSchemeConfig[] = [];

  if (snapshot.analysisSchemes.length > 0) {
    result = snapshot.analysisSchemes;
    return result;
  }

  result = listAnalysisSchemesForPortfolio(portfolioKind);
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
