import type {
  ClassificationSchemeWithValuesDto,
  ClassificationValueDto,
} from "@repo/shared";

export function findValueAcrossSchemes(
  schemes: ClassificationSchemeWithValuesDto[],
  valueId: string,
): ClassificationValueDto | null {
  let result: ClassificationValueDto | null = null;

  for (const scheme of schemes) {
    const found = scheme.values.find((value) => value.id === valueId);
    if (!found) {
      continue;
    }
    result = {
      ...found,
      schemeId: found.schemeId ?? scheme.id,
    };
    break;
  }

  return result;
}

export function buildClassificationBreadcrumb(
  schemes: ClassificationSchemeWithValuesDto[],
  parentStack: string[],
  rootLabel: string,
): Array<{ id: string | null; label: string }> {
  let result: Array<{ id: string | null; label: string }> = [
    { id: null, label: rootLabel },
  ];

  for (const valueId of parentStack) {
    const value = findValueAcrossSchemes(schemes, valueId);
    if (!value) {
      continue;
    }
    result.push({ id: valueId, label: value.name });
  }

  return result;
}

export function resolveValuesByIds(
  schemes: ClassificationSchemeWithValuesDto[],
  valueIds: string[],
): ClassificationValueDto[] {
  let result: ClassificationValueDto[] = [];

  for (const valueId of valueIds) {
    const value = findValueAcrossSchemes(schemes, valueId);
    if (!value) {
      continue;
    }
    result.push(value);
  }

  return result;
}
