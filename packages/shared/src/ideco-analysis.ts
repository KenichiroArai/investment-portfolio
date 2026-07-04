export const IDECO_SCHEME_CODES = {
  productType: "ideco_product_type",
  majorCategory: "ideco_major_category",
  productStyle: "ideco_product_style",
  instrumentStatus: "ideco_instrument_status",
  region: "ideco_region",
  assetClass: "ideco_asset_class",
  productCategory: "ideco_product_category",
  productGroup: "ideco_product_group",
} as const;

export const IDECO_INSTRUMENT_METADATA_SCHEME_CODES = new Set<string>([
  IDECO_SCHEME_CODES.majorCategory,
  IDECO_SCHEME_CODES.productStyle,
  IDECO_SCHEME_CODES.instrumentStatus,
]);

export function isIdecoAnalysisSchemeCode(schemeCode: string): boolean {
  let result = false;

  if (!schemeCode.startsWith("ideco_")) {
    return result;
  }

  if (IDECO_INSTRUMENT_METADATA_SCHEME_CODES.has(schemeCode)) {
    return result;
  }

  result = true;
  return result;
}
