import {
  SBI_WRAP_PRODUCT_VALUES,
  SBI_WRAP_SCHEME_CODES,
  SBI_WRAP_SCHEME_NAMES,
  type SbiWrapProductCode,
} from "@repo/shared";

import {
  createClassificationScheme,
  createClassificationValue,
  fetchClassificationSchemes,
  setInstrumentClassifications,
} from "@/lib/api-client";

export async function ensureSbiWrapProductClassificationValueId(
  portfolioCode: string,
  productCode: SbiWrapProductCode,
): Promise<string | null> {
  let result: string | null = null;

  const schemesResponse = await fetchClassificationSchemes(portfolioCode);
  if (!schemesResponse.ok) {
    return result;
  }

  let scheme = schemesResponse.data.find(
    (item) => item.code === SBI_WRAP_SCHEME_CODES.product,
  );

  if (!scheme) {
    const createSchemeResponse = await createClassificationScheme(portfolioCode, {
      code: SBI_WRAP_SCHEME_CODES.product,
      name: SBI_WRAP_SCHEME_NAMES.product,
    });
    if (!createSchemeResponse.ok) {
      return result;
    }

    for (const product of SBI_WRAP_PRODUCT_VALUES) {
      const createValueResponse = await createClassificationValue(createSchemeResponse.data.id, {
        code: product.code,
        name: product.name,
        sortOrder: product.sortOrder,
      });
      if (!createValueResponse.ok) {
        return result;
      }
    }

    const refreshed = await fetchClassificationSchemes(portfolioCode);
    if (!refreshed.ok) {
      return result;
    }
    scheme = refreshed.data.find((item) => item.code === SBI_WRAP_SCHEME_CODES.product);
  }

  if (!scheme) {
    return result;
  }

  const existingValue = scheme.values.find((value) => value.code === productCode);
  if (existingValue) {
    result = existingValue.id;
    return result;
  }

  const product = SBI_WRAP_PRODUCT_VALUES.find((item) => item.code === productCode);
  if (!product) {
    return result;
  }

  const createValueResponse = await createClassificationValue(scheme.id, {
    code: product.code,
    name: product.name,
    sortOrder: product.sortOrder,
  });
  if (!createValueResponse.ok) {
    return result;
  }

  result = createValueResponse.data.id;
  return result;
}

export async function assignSbiWrapProductClassification(
  portfolioCode: string,
  instrumentId: string,
  productCode: SbiWrapProductCode,
): Promise<boolean> {
  let result = false;

  const valueId = await ensureSbiWrapProductClassificationValueId(portfolioCode, productCode);
  if (!valueId) {
    return result;
  }

  const response = await setInstrumentClassifications(instrumentId, {
    classificationValueIds: [valueId],
  });
  if (!response.ok) {
    return result;
  }

  result = true;
  return result;
}
