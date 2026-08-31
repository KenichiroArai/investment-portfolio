import type {
  ClassificationValueDto,
  ClassificationValueLinkDto,
} from "./types";

export type ClassificationGraphValue = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  schemeId: string;
  schemeCode: string;
};

export type ClassificationGraph = {
  valuesById: Map<string, ClassificationGraphValue>;
  childIdsByParentId: Map<string, string[]>;
  parentIdsByChildId: Map<string, string[]>;
  leafValueIds: Set<string>;
};

export type CopyClassificationMode = "value_only" | "with_children" | "with_subtree";

export type CopyClassificationResult = {
  copiedValueIds: string[];
  copiedLinks: ClassificationValueLinkDto[];
};

export type ValidateLinkAdditionResult =
  | { ok: true }
  | { ok: false; reason: string };

function compareValueDisplayOrder(
  left: ClassificationGraphValue,
  right: ClassificationGraphValue,
): number {
  let result = left.sortOrder - right.sortOrder;
  if (result !== 0) {
    return result;
  }

  result = left.name.localeCompare(right.name);
  if (result !== 0) {
    return result;
  }

  result = left.code.localeCompare(right.code);
  return result;
}

function sortChildIds(
  childIds: string[],
  valuesById: Map<string, ClassificationGraphValue>,
  childIdsByParentId: Map<string, string[]>,
  links: ClassificationValueLinkDto[],
): string[] {
  let result: string[] = [];
  const sortOrderByChildId = new Map<string, number>();

  for (const link of links) {
    sortOrderByChildId.set(link.childValueId, link.sortOrder);
  }

  result = [...childIds].sort((leftId, rightId) => {
    const left = valuesById.get(leftId);
    const right = valuesById.get(rightId);
    /* v8 ignore start */
    if (!left || !right) {
      return leftId.localeCompare(rightId);
    }
    /* v8 ignore stop */

    /* v8 ignore next 2 */
    const leftSort = sortOrderByChildId.get(leftId) ?? left.sortOrder;
    const rightSort = sortOrderByChildId.get(rightId) ?? right.sortOrder;
    let compareResult = leftSort - rightSort;
    if (compareResult !== 0) {
      return compareResult;
    }

    compareResult = compareValueDisplayOrder(left, right);
    return compareResult;
  });

  return result;
}

export function buildClassificationGraph(
  values: ClassificationGraphValue[],
  links: ClassificationValueLinkDto[],
): ClassificationGraph {
  let result: ClassificationGraph = {
    valuesById: new Map(),
    childIdsByParentId: new Map(),
    parentIdsByChildId: new Map(),
    leafValueIds: new Set(),
  };

  for (const value of values) {
    result.valuesById.set(value.id, value);
  }

  for (const link of links) {
    if (!result.valuesById.has(link.parentValueId)) {
      continue;
    }
    if (!result.valuesById.has(link.childValueId)) {
      continue;
    }

    const existingChildren = result.childIdsByParentId.get(link.parentValueId) ?? [];
    if (!existingChildren.includes(link.childValueId)) {
      existingChildren.push(link.childValueId);
      result.childIdsByParentId.set(link.parentValueId, existingChildren);
    }

    const existingParents = result.parentIdsByChildId.get(link.childValueId) ?? [];
    if (!existingParents.includes(link.parentValueId)) {
      existingParents.push(link.parentValueId);
      result.parentIdsByChildId.set(link.childValueId, existingParents);
    }
  }

  for (const [parentId, childIds] of result.childIdsByParentId) {
    result.childIdsByParentId.set(
      parentId,
      sortChildIds(childIds, result.valuesById, result.childIdsByParentId, links),
    );
  }

  for (const value of values) {
    if (!result.childIdsByParentId.has(value.id)) {
      result.leafValueIds.add(value.id);
    }
  }

  return result;
}

export function isLeafValue(valueId: string, graph: ClassificationGraph): boolean {
  let result = graph.leafValueIds.has(valueId);
  return result;
}

export function getDirectChildIds(
  parentValueId: string,
  graph: ClassificationGraph,
): string[] {
  let result = graph.childIdsByParentId.get(parentValueId) ?? [];
  return result;
}

export function getDescendantValueIds(
  rootValueId: string,
  graph: ClassificationGraph,
): Set<string> {
  let result = new Set<string>();
  const stack = [rootValueId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || result.has(currentId)) {
      continue;
    }

    result.add(currentId);
    const childIds = graph.childIdsByParentId.get(currentId) ?? [];
    for (const childId of childIds) {
      stack.push(childId);
    }
  }

  return result;
}

export function getDescendantLeafIds(
  rootValueId: string,
  graph: ClassificationGraph,
): Set<string> {
  let result = new Set<string>();
  const descendants = getDescendantValueIds(rootValueId, graph);

  for (const valueId of descendants) {
    if (graph.leafValueIds.has(valueId)) {
      result.add(valueId);
    }
  }

  return result;
}

export function getRootValueIds(
  schemeId: string,
  graph: ClassificationGraph,
): string[] {
  let result: string[] = [];

  for (const value of graph.valuesById.values()) {
    if (value.schemeId !== schemeId) {
      continue;
    }

    const parentIds = graph.parentIdsByChildId.get(value.id) ?? [];
    if (parentIds.length === 0) {
      result.push(value.id);
    }
  }

  result.sort((leftId, rightId) => {
    const left = graph.valuesById.get(leftId);
    const right = graph.valuesById.get(rightId);
    /* v8 ignore start */
    if (!left || !right) {
      return leftId.localeCompare(rightId);
    }
    /* v8 ignore stop */

    return compareValueDisplayOrder(left, right);
  });

  return result;
}

export function getOrphanValueIdsInScheme(
  schemeId: string,
  graph: ClassificationGraph,
): string[] {
  let result: string[] = [];

  for (const value of graph.valuesById.values()) {
    if (value.schemeId !== schemeId) {
      continue;
    }

    const parentIds = graph.parentIdsByChildId.get(value.id) ?? [];
    if (parentIds.length === 0) {
      result.push(value.id);
    }
  }

  return result;
}

export function validateLinkAddition(
  graph: ClassificationGraph,
  parentValueId: string,
  childValueId: string,
): ValidateLinkAdditionResult {
  let result: ValidateLinkAdditionResult = { ok: true };

  if (parentValueId === childValueId) {
    result = { ok: false, reason: "親と子に同じ分類値は指定できません。" };
    return result;
  }

  if (!graph.valuesById.has(parentValueId)) {
    result = { ok: false, reason: "親分類値が見つかりません。" };
    return result;
  }

  if (!graph.valuesById.has(childValueId)) {
    result = { ok: false, reason: "子分類値が見つかりません。" };
    return result;
  }

  const existingChildren = graph.childIdsByParentId.get(parentValueId) ?? [];
  if (existingChildren.includes(childValueId)) {
    result = { ok: false, reason: "同じ親子リンクが既に存在します。" };
    return result;
  }

  const descendantsOfChild = getDescendantValueIds(childValueId, graph);
  if (descendantsOfChild.has(parentValueId)) {
    result = { ok: false, reason: "循環参照になるためリンクを追加できません。" };
    return result;
  }

  return result;
}

export function enrichClassificationValues(
  values: Array<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
    schemeId: string;
  }>,
  links: ClassificationValueLinkDto[],
): ClassificationValueDto[] {
  let result: ClassificationValueDto[] = [];
  const graph = buildClassificationGraph(values, links);

  for (const value of values) {
    let dto: ClassificationValueDto = {
      id: value.id,
      code: value.code,
      name: value.name,
      sortOrder: value.sortOrder,
      schemeId: value.schemeId,
      parentIds: graph.parentIdsByChildId.get(value.id) ?? [],
      childIds: graph.childIdsByParentId.get(value.id) ?? [],
      isLeaf: graph.leafValueIds.has(value.id),
    };
    result.push(dto);
  }

  result.sort((left, right) => {
    let compareResult = left.sortOrder - right.sortOrder;
    if (compareResult !== 0) {
      return compareResult;
    }

    compareResult = left.name.localeCompare(right.name);
    if (compareResult !== 0) {
      return compareResult;
    }

    compareResult = left.code.localeCompare(right.code);
    return compareResult;
  });

  return result;
}

export function collectSubtreeValueIds(
  rootValueId: string,
  graph: ClassificationGraph,
  mode: CopyClassificationMode,
): string[] {
  let result: string[] = [];

  if (mode === "value_only") {
    result = [rootValueId];
    return result;
  }

  if (mode === "with_children") {
    result = [rootValueId, ...getDirectChildIds(rootValueId, graph)];
    return result;
  }

  result = [...getDescendantValueIds(rootValueId, graph)];
  return result;
}

export function collectSubtreeLinks(
  valueIds: Set<string>,
  links: ClassificationValueLinkDto[],
): ClassificationValueLinkDto[] {
  let result: ClassificationValueLinkDto[] = [];

  for (const link of links) {
    if (!valueIds.has(link.parentValueId)) {
      continue;
    }
    if (!valueIds.has(link.childValueId)) {
      continue;
    }
    result.push(link);
  }

  return result;
}

export function buildValueCodeToIdMap(
  values: ClassificationGraphValue[],
  schemeCode: string,
  schemeIdByCode: Map<string, string>,
): Map<string, string> {
  let result = new Map<string, string>();
  const schemeId = schemeIdByCode.get(schemeCode);
  if (!schemeId) {
    return result;
  }

  for (const value of values) {
    if (value.schemeId !== schemeId) {
      continue;
    }
    result.set(value.code, value.id);
  }

  return result;
}

export function buildValueIdToCodeMap(
  values: ClassificationGraphValue[],
): Map<string, string> {
  let result = new Map<string, string>();

  for (const value of values) {
    result.set(value.id, value.code);
  }

  return result;
}

export function getLineLeafValueIdsByScheme(
  tags: Array<{ schemeCode: string; valueCode: string }>,
  values: ClassificationGraphValue[],
  schemeCodeById: Map<string, string>,
  valueCodeBySchemeCode: Map<string, Map<string, string>>,
): Map<string, Set<string>> {
  let result = new Map<string, Set<string>>();

  for (const tag of tags) {
    const codeMap = valueCodeBySchemeCode.get(tag.schemeCode);
    if (!codeMap) {
      continue;
    }

    const valueId = codeMap.get(tag.valueCode);
    if (!valueId) {
      continue;
    }

    const existing = result.get(tag.schemeCode) ?? new Set<string>();
    existing.add(valueId);
    result.set(tag.schemeCode, existing);
  }

  return result;
}

export function lineMatchesDescendantFilter(
  lineLeafIdsByScheme: Map<string, Set<string>>,
  filterSchemeCode: string,
  allowedLeafIds: Set<string>,
  graph: ClassificationGraph,
  values: ClassificationGraphValue[],
  schemeCodeById: Map<string, string>,
): boolean {
  let result = false;
  const taggedLeafIds = lineLeafIdsByScheme.get(filterSchemeCode);
  if (!taggedLeafIds || taggedLeafIds.size === 0) {
    return result;
  }

  for (const leafId of taggedLeafIds) {
    if (allowedLeafIds.has(leafId)) {
      result = true;
      return result;
    }
  }

  return result;
}

export function lineMatchesCrossSchemeChildFilter(
  lineLeafIdsByScheme: Map<string, Set<string>>,
  contextFilterSchemeCode: string,
  contextAllowedLeafIds: Set<string>,
  childValueId: string,
  graph: ClassificationGraph,
  childSchemeCode: string,
): boolean {
  let result = false;

  const contextLeafIds = lineLeafIdsByScheme.get(contextFilterSchemeCode);
  if (!contextLeafIds || contextLeafIds.size === 0) {
    return result;
  }

  let matchesContext = false;
  for (const leafId of contextLeafIds) {
    if (contextAllowedLeafIds.has(leafId)) {
      matchesContext = true;
      break;
    }
  }

  if (!matchesContext) {
    return result;
  }

  const childAllowedLeafIds = getDescendantLeafIds(childValueId, graph);
  const childLeafIds = lineLeafIdsByScheme.get(childSchemeCode);
  if (!childLeafIds || childLeafIds.size === 0) {
    return result;
  }

  for (const leafId of childLeafIds) {
    if (childAllowedLeafIds.has(leafId)) {
      result = true;
      return result;
    }
  }

  return result;
}
