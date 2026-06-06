import {
  IDECO_SCHEME_CODES,
  IDECO_SCHEME_NAMES,
} from "./ideco-analysis";

export type AnalysisSchemeConfig = {
  schemeCode: string;
  schemeName: string;
};

export function listAnalysisSchemesForPortfolio(
  kind: string,
): AnalysisSchemeConfig[] {
  let result: AnalysisSchemeConfig[] = [];

  if (kind !== "ideco") {
    return result;
  }

  result = [
    {
      schemeCode: IDECO_SCHEME_CODES.region,
      schemeName: IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.region],
    },
    {
      schemeCode: IDECO_SCHEME_CODES.assetClass,
      schemeName: IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.assetClass],
    },
    {
      schemeCode: IDECO_SCHEME_CODES.productType,
      schemeName: IDECO_SCHEME_NAMES[IDECO_SCHEME_CODES.productType],
    },
  ];
  return result;
}
