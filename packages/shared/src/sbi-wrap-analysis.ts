export const SBI_WRAP_SCHEME_CODES = {
  product: "sbi_wrap_product",
} as const;

export const SBI_WRAP_SCHEME_NAMES = {
  product: "商品",
} as const;

export type SbiWrapProductCode =
  | "ai_investment"
  | "takumi"
  | "rebanavi"
  | "reba_choice"
  | "all_equity";

export type SbiWrapProductDefinition = {
  code: SbiWrapProductCode;
  name: string;
  sortOrder: number;
};

export const SBI_WRAP_PRODUCT_VALUES: SbiWrapProductDefinition[] = [
  { code: "ai_investment", name: "AI投資", sortOrder: 1 },
  { code: "takumi", name: "匠の運用", sortOrder: 2 },
  { code: "rebanavi", name: "レバナビ", sortOrder: 3 },
  { code: "reba_choice", name: "レバチョイス", sortOrder: 4 },
  { code: "all_equity", name: "ALL株式", sortOrder: 5 },
];

const PRODUCT_BY_CODE = new Map(
  SBI_WRAP_PRODUCT_VALUES.map((item) => [item.code, item] as const),
);

const PRODUCT_BY_NAME = new Map(
  SBI_WRAP_PRODUCT_VALUES.map((item) => [item.name, item] as const),
);

export function isSbiWrapAnalysisSchemeCode(schemeCode: string): boolean {
  let result = false;

  if (schemeCode === SBI_WRAP_SCHEME_CODES.product) {
    result = true;
  }

  return result;
}

export function findSbiWrapProductByCode(
  code: string,
): SbiWrapProductDefinition | null {
  let result: SbiWrapProductDefinition | null = null;
  result = PRODUCT_BY_CODE.get(code as SbiWrapProductCode) ?? null;
  return result;
}

export function findSbiWrapProductByName(
  name: string,
): SbiWrapProductDefinition | null {
  let result: SbiWrapProductDefinition | null = null;
  result = PRODUCT_BY_NAME.get(name.trim()) ?? null;
  return result;
}

export function buildSbiWrapAccountId(productName: string): string {
  let result = "sbi-wrap:unknown";
  const product = findSbiWrapProductByName(productName);

  if (!product) {
    const trimmed = productName.trim();
    if (trimmed === "") {
      return result;
    }
    result = `sbi-wrap:${trimmed}`;
    return result;
  }

  result = `sbi-wrap:${product.name}`;
  return result;
}

export function buildSbiWrapAccountName(productName: string): string {
  let result = "不明";
  const product = findSbiWrapProductByName(productName);

  if (!product) {
    const trimmed = productName.trim();
    if (trimmed === "") {
      return result;
    }
    result = trimmed;
    return result;
  }

  result = product.name;
  return result;
}

export function resolveSbiWrapProductCodeFromAccountId(
  accountId: string,
): SbiWrapProductCode | null {
  let result: SbiWrapProductCode | null = null;
  const prefix = "sbi-wrap:";

  if (!accountId.startsWith(prefix)) {
    return result;
  }

  const name = accountId.slice(prefix.length);
  const product = findSbiWrapProductByName(name);
  if (!product) {
    return result;
  }

  result = product.code;
  return result;
}
