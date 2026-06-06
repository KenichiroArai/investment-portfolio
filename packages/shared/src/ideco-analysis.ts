import { IdecoCsvError } from "./ideco-csv-utils";

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
} as const;

export const IDECO_SCHEME_NAMES = {
  [IDECO_SCHEME_CODES.productType]: "商品タイプ",
  [IDECO_SCHEME_CODES.majorCategory]: "大分類",
  [IDECO_SCHEME_CODES.productStyle]: "商品タイプ(スタイル)",
  [IDECO_SCHEME_CODES.instrumentStatus]: "ステータス",
  [IDECO_SCHEME_CODES.region]: "地域分類",
  [IDECO_SCHEME_CODES.assetClass]: "資産分類",
} as const;

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
