export const MONEX_SCHEME_CODES = {
  assetClass: "monex_asset_class",
} as const;

export function isMonexAnalysisSchemeCode(schemeCode: string): boolean {
  let result = false;

  if (schemeCode === MONEX_SCHEME_CODES.assetClass) {
    result = true;
  }

  return result;
}

export const MONEX_ASSET_CLASS_FILE_MAP: Record<
  string,
  { code: string; name: string }
> = {
  "国内株式.csv": { code: "domestic_equity", name: "国内株式" },
  "先進国株式.csv": { code: "developed_equity", name: "先進国株式" },
  "新興国株式.csv": { code: "emerging_equity", name: "新興国株式" },
  "海外REIT.csv": { code: "foreign_reit", name: "海外REIT" },
  "コモディティ.csv": { code: "commodity", name: "コモディティ" },
  "国内REIT.csv": { code: "domestic_reit", name: "国内REIT" },
  "先進国債券.csv": { code: "developed_bond", name: "先進国債券" },
  "国内債券.csv": { code: "domestic_bond", name: "国内債券" },
  "新興国債券.csv": { code: "emerging_bond", name: "新興国債券" },
  "ハイ・イールド債券.csv": { code: "high_yield_bond", name: "ハイ・イールド債券" },
  "短期金融資産.csv": { code: "short_term", name: "短期金融資産" },
};

export const MONEX_ASSET_CLASS_CSV_FILES = Object.keys(MONEX_ASSET_CLASS_FILE_MAP);
