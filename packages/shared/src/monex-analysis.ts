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

export const MONEX_ASSET_CLASS_VALUES: Array<{ code: string; name: string }> = [
  { code: "domestic_equity", name: "国内株式" },
  { code: "developed_equity", name: "先進国株式" },
  { code: "emerging_equity", name: "新興国株式" },
  { code: "foreign_reit", name: "海外REIT" },
  { code: "commodity", name: "コモディティ" },
  { code: "domestic_reit", name: "国内REIT" },
  { code: "developed_bond", name: "先進国債券" },
  { code: "domestic_bond", name: "国内債券" },
  { code: "emerging_bond", name: "新興国債券" },
  { code: "high_yield_bond", name: "ハイ・イールド債券" },
  { code: "short_term", name: "短期金融資産" },
  { code: "other", name: "その他資産" },
];

export const MONEX_ASSET_CLASS_LABEL_MAP: Record<
  string,
  { code: string; name: string }
> = {
  国内株式全体: { code: "domestic_equity", name: "国内株式" },
  先進国株式全体: { code: "developed_equity", name: "先進国株式" },
  新興国株式全体: { code: "emerging_equity", name: "新興国株式" },
  海外REIT全体: { code: "foreign_reit", name: "海外REIT" },
  コモディティ全体: { code: "commodity", name: "コモディティ" },
  国内REIT全体: { code: "domestic_reit", name: "国内REIT" },
  先進国債券全体: { code: "developed_bond", name: "先進国債券" },
  国内債券全体: { code: "domestic_bond", name: "国内債券" },
  新興国債券全体: { code: "emerging_bond", name: "新興国債券" },
  "ハイ・イールド債券全体": { code: "high_yield_bond", name: "ハイ・イールド債券" },
  短期金融資産全体: { code: "short_term", name: "短期金融資産" },
  その他資産全体: { code: "other", name: "その他資産" },
};
