import { IdecoCsvError, stableIdecoCodeSuffix } from "./ideco-csv-utils";

export type IdecoClassificationDefinition = {
  name: string;
  code: string;
  sortOrder: number;
};

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

export const IDECO_SCHEME_NAMES = {
  [IDECO_SCHEME_CODES.productType]: "商品タイプ",
  [IDECO_SCHEME_CODES.majorCategory]: "大分類",
  [IDECO_SCHEME_CODES.productStyle]: "商品タイプ(スタイル)",
  [IDECO_SCHEME_CODES.instrumentStatus]: "ステータス",
  [IDECO_SCHEME_CODES.region]: "地域分類",
  [IDECO_SCHEME_CODES.assetClass]: "資産分類",
  [IDECO_SCHEME_CODES.productCategory]: "商品分類",
  [IDECO_SCHEME_CODES.productGroup]: "商品グループ",
} as const;

export const IDECO_INSTRUMENT_METADATA_SCHEME_CODES = new Set<string>([
  IDECO_SCHEME_CODES.majorCategory,
  IDECO_SCHEME_CODES.productStyle,
  IDECO_SCHEME_CODES.instrumentStatus,
]);

export const IDECO_PRODUCT_GROUPS: IdecoClassificationDefinition[] = [
  { name: "主要資産", code: "major_assets", sortOrder: 0 },
  { name: "その他", code: "other", sortOrder: 1 },
];

export const IDECO_PRODUCT_TYPES: IdecoClassificationDefinition[] = [
  { name: "国内株式", code: "domestic_equity", sortOrder: 0 },
  { name: "内外株式", code: "domestic_foreign_equity", sortOrder: 1 },
  { name: "海外株式", code: "foreign_equity", sortOrder: 2 },
  { name: "国内債券", code: "domestic_bond", sortOrder: 3 },
  { name: "海外債券", code: "foreign_bond", sortOrder: 4 },
  { name: "国内不動産投信", code: "domestic_reit", sortOrder: 5 },
  { name: "海外不動産投信", code: "foreign_reit", sortOrder: 6 },
  { name: "内外資産複合", code: "balanced", sortOrder: 7 },
  { name: "国内その他資産", code: "domestic_other", sortOrder: 8 },
  { name: "元本確保", code: "principal_protected", sortOrder: 9 },
];

export const IDECO_MAJOR_CATEGORIES: IdecoClassificationDefinition[] = [
  { name: "定期預金", code: "time_deposit", sortOrder: 0 },
  { name: "投資信託", code: "mutual_fund", sortOrder: 1 },
  { name: "待機資金", code: "standby_cash", sortOrder: 2 },
];

export const IDECO_PRODUCT_STYLES: IdecoClassificationDefinition[] = [
  { name: "パッシブ", code: "passive", sortOrder: 0 },
  { name: "アクティブ", code: "active", sortOrder: 1 },
];

export const IDECO_INSTRUMENT_STATUSES: IdecoClassificationDefinition[] = [
  { name: "除外手続中", code: "exclusion_pending", sortOrder: 0 },
];

export const IDECO_REGIONS: IdecoClassificationDefinition[] = [
  { name: "国内", code: "domestic", sortOrder: 0 },
  { name: "内外", code: "domestic_foreign", sortOrder: 1 },
  { name: "海外", code: "foreign", sortOrder: 2 },
];

export const IDECO_ASSET_CLASSES: IdecoClassificationDefinition[] = [
  { name: "株式", code: "equity", sortOrder: 0 },
  { name: "債券", code: "bond", sortOrder: 1 },
  { name: "不動産", code: "real_estate", sortOrder: 2 },
  { name: "複合", code: "balanced", sortOrder: 3 },
  { name: "その他", code: "other", sortOrder: 4 },
];

const PRODUCT_TYPE_BY_NAME = new Map(
  IDECO_PRODUCT_TYPES.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

const MAJOR_CATEGORY_BY_NAME = new Map(
  IDECO_MAJOR_CATEGORIES.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

const PRODUCT_STYLE_BY_NAME = new Map(
  IDECO_PRODUCT_STYLES.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

const INSTRUMENT_STATUS_BY_NAME = new Map(
  IDECO_INSTRUMENT_STATUSES.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

const PRODUCT_TYPE_TO_ANALYSIS = new Map<
  string,
  { regionCode: string; assetClassCode: string }
>([
  ["domestic_equity", { regionCode: "domestic", assetClassCode: "equity" }],
  [
    "domestic_foreign_equity",
    { regionCode: "domestic_foreign", assetClassCode: "equity" },
  ],
  ["foreign_equity", { regionCode: "foreign", assetClassCode: "equity" }],
  ["domestic_bond", { regionCode: "domestic", assetClassCode: "bond" }],
  ["foreign_bond", { regionCode: "foreign", assetClassCode: "bond" }],
  [
    "domestic_reit",
    { regionCode: "domestic", assetClassCode: "real_estate" },
  ],
  [
    "foreign_reit",
    { regionCode: "foreign", assetClassCode: "real_estate" },
  ],
  [
    "balanced",
    { regionCode: "domestic_foreign", assetClassCode: "balanced" },
  ],
  ["domestic_other", { regionCode: "domestic", assetClassCode: "other" }],
]);

export type IdecoAnalysisTags = {
  regionCode: string;
  assetClassCode: string;
};

export function resolveIdecoProductType(name: string): IdecoClassificationDefinition {
  let result: IdecoClassificationDefinition | null = null;

  const definition = PRODUCT_TYPE_BY_NAME.get(name.trim());
  if (!definition) {
    throw new IdecoCsvError(`未対応の商品タイプです: ${name}`);
  }

  result = definition;
  return result;
}

export function resolveIdecoMajorCategory(
  name: string,
): IdecoClassificationDefinition {
  let result: IdecoClassificationDefinition | null = null;

  const definition = MAJOR_CATEGORY_BY_NAME.get(name.trim());
  if (!definition) {
    throw new IdecoCsvError(`未対応の大分類です: ${name}`);
  }

  result = definition;
  return result;
}

export function resolveIdecoProductStyle(
  name: string,
): IdecoClassificationDefinition | null {
  let result: IdecoClassificationDefinition | null = null;

  const trimmed = name.trim();
  if (trimmed === "") {
    return result;
  }

  const definition = PRODUCT_STYLE_BY_NAME.get(trimmed);
  if (!definition) {
    throw new IdecoCsvError(`未対応の商品タイプ(スタイル)です: ${name}`);
  }

  result = definition;
  return result;
}

export function resolveIdecoInstrumentStatus(
  name: string,
): IdecoClassificationDefinition | null {
  let result: IdecoClassificationDefinition | null = null;

  const trimmed = name.trim();
  if (trimmed === "") {
    return result;
  }

  const definition = INSTRUMENT_STATUS_BY_NAME.get(trimmed);
  if (!definition) {
    throw new IdecoCsvError(`未対応のステータスです: ${name}`);
  }

  result = definition;
  return result;
}

export function resolveIdecoAnalysisTags(
  productTypeCode: string,
): IdecoAnalysisTags | null {
  let result: IdecoAnalysisTags | null = null;

  const mapping = PRODUCT_TYPE_TO_ANALYSIS.get(productTypeCode);
  if (!mapping) {
    return result;
  }

  result = mapping;
  return result;
}

export function productTypeCodeFromName(name: string): string {
  let result = resolveIdecoProductType(name).code;
  return result;
}

const ANALYSIS_AXIS_NAME_TO_SCHEME_CODE = new Map<string, string>(
  Object.entries(IDECO_SCHEME_NAMES).map(([schemeCode, schemeName]) => {
    let result: [string, string] = [schemeName, schemeCode];
    return result;
  }),
);

const REGION_BY_NAME = new Map(
  IDECO_REGIONS.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

const ASSET_CLASS_BY_NAME = new Map(
  IDECO_ASSET_CLASSES.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

const PRODUCT_GROUP_BY_NAME = new Map(
  IDECO_PRODUCT_GROUPS.map((item) => {
    let result: [string, IdecoClassificationDefinition] = [item.name, item];
    return result;
  }),
);

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

export function resolveIdecoAnalysisAxisSchemeCode(axisName: string): string {
  let result = "";

  const trimmed = axisName.trim();
  if (trimmed === "") {
    return result;
  }

  const known = ANALYSIS_AXIS_NAME_TO_SCHEME_CODE.get(trimmed);
  if (known) {
    result = known;
    return result;
  }

  result = `ideco_axis_${stableIdecoCodeSuffix(trimmed)}`;
  return result;
}

export function tryResolveIdecoClassificationByName(
  name: string,
): IdecoClassificationDefinition | null {
  let result: IdecoClassificationDefinition | null = null;

  const trimmed = name.trim();
  if (trimmed === "") {
    return result;
  }

  const productType = PRODUCT_TYPE_BY_NAME.get(trimmed);
  if (productType) {
    result = productType;
    return result;
  }

  const productGroup = PRODUCT_GROUP_BY_NAME.get(trimmed);
  if (productGroup) {
    result = productGroup;
    return result;
  }

  const region = REGION_BY_NAME.get(trimmed);
  if (region) {
    result = region;
    return result;
  }

  const assetClass = ASSET_CLASS_BY_NAME.get(trimmed);
  if (assetClass) {
    result = assetClass;
    return result;
  }

  return result;
}

export function resolveIdecoAnalysisCategoryDefinition(
  schemeCode: string,
  categoryName: string,
): IdecoClassificationDefinition {
  let result: IdecoClassificationDefinition | null = null;

  const trimmed = categoryName.trim();
  if (trimmed === "" || trimmed === "すべて") {
    throw new IdecoCsvError(`分析カテゴリ名が不正です: ${categoryName}`);
  }

  if (schemeCode === IDECO_SCHEME_CODES.productType) {
    result = resolveIdecoProductType(trimmed);
    return result;
  }

  if (schemeCode === IDECO_SCHEME_CODES.productCategory) {
    result = resolveIdecoProductType(trimmed);
    return result;
  }

  if (schemeCode === IDECO_SCHEME_CODES.region) {
    const region = REGION_BY_NAME.get(trimmed);
    if (!region) {
      throw new IdecoCsvError(`未対応の地域分類です: ${categoryName}`);
    }
    result = region;
    return result;
  }

  if (schemeCode === IDECO_SCHEME_CODES.assetClass) {
    const assetClass = ASSET_CLASS_BY_NAME.get(trimmed);
    if (!assetClass) {
      throw new IdecoCsvError(`未対応の資産分類です: ${categoryName}`);
    }
    result = assetClass;
    return result;
  }

  if (schemeCode === IDECO_SCHEME_CODES.productGroup) {
    const productGroup = PRODUCT_GROUP_BY_NAME.get(trimmed);
    if (!productGroup) {
      throw new IdecoCsvError(`未対応の商品グループです: ${categoryName}`);
    }
    result = productGroup;
    return result;
  }

  const known = tryResolveIdecoClassificationByName(trimmed);
  if (known) {
    result = known;
    return result;
  }

  result = {
    name: trimmed,
    code: stableIdecoCodeSuffix(trimmed),
    sortOrder: 0,
  };
  return result;
}
