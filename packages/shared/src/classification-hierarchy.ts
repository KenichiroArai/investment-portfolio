import type {
  ClassificationValueDto,
  ClassificationValueLinkDto,
} from "./types";

export type ClassificationGraphValue = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
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

export function getAncestorValueIds(
  valueId: string,
  graph: ClassificationGraph,
): Set<string> {
  let result = new Set<string>();
  const stack = [...(graph.parentIdsByChildId.get(valueId) ?? [])];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || result.has(currentId)) {
      continue;
    }

    result.add(currentId);
    const parentIds = graph.parentIdsByChildId.get(currentId) ?? [];
    for (const parentId of parentIds) {
      stack.push(parentId);
    }
  }

  result.delete(valueId);
  return result;
}

function compareValueIdDisplayOrder(
  leftId: string,
  rightId: string,
  graph: ClassificationGraph,
): number {
  let result = 0;
  const left = graph.valuesById.get(leftId);
  const right = graph.valuesById.get(rightId);

  /* v8 ignore start */
  if (!left || !right) {
    result = leftId.localeCompare(rightId);
    return result;
  }
  /* v8 ignore stop */

  result = compareValueDisplayOrder(left, right);
  return result;
}

export function getTaggedAncestorValueIds(
  valueId: string,
  taggedValueIds: Set<string>,
  graph: ClassificationGraph,
): string[] {
  let result: string[] = [];

  for (const ancestorId of getAncestorValueIds(valueId, graph)) {
    if (!taggedValueIds.has(ancestorId)) {
      continue;
    }
    result.push(ancestorId);
  }

  // 近い（深い）祖先を先頭にする
  result.sort((leftId, rightId) => {
    let compareResult =
      getAncestorValueIds(rightId, graph).size - getAncestorValueIds(leftId, graph).size;
    if (compareResult !== 0) {
      return compareResult;
    }

    compareResult = compareValueIdDisplayOrder(leftId, rightId, graph);
    return compareResult;
  });

  return result;
}

export function getNearestTaggedDescendantIds(
  valueId: string,
  taggedValueIds: Set<string>,
  graph: ClassificationGraph,
): string[] {
  let result: string[] = [];
  const candidateIds: string[] = [];

  for (const descendantId of getDescendantValueIds(valueId, graph)) {
    if (descendantId === valueId) {
      continue;
    }
    if (!taggedValueIds.has(descendantId)) {
      continue;
    }
    candidateIds.push(descendantId);
  }

  for (const candidateId of candidateIds) {
    const ancestorIds = getAncestorValueIds(candidateId, graph);
    const hasNearerCandidate = candidateIds.some(
      (otherId) => otherId !== candidateId && ancestorIds.has(otherId),
    );
    if (hasNearerCandidate) {
      continue;
    }
    result.push(candidateId);
  }

  result.sort((leftId, rightId) =>
    compareValueIdDisplayOrder(leftId, rightId, graph),
  );
  return result;
}

export type HierarchyTagWeight = {
  valueId: string;
  weight: number;
};

function readTagWeight(
  weightByValueId: Map<string, number>,
  valueId: string,
): number {
  let result = 0;
  const weight = weightByValueId.get(valueId);

  /* v8 ignore start */
  if (weight === undefined) {
    return result;
  }
  /* v8 ignore stop */

  result = weight;
  return result;
}

function isMultiParentValue(valueId: string, graph: ClassificationGraph): boolean {
  let result = false;
  const parentIds = graph.parentIdsByChildId.get(valueId) ?? [];
  result = parentIds.length > 1;
  return result;
}

function transferAncestorWeightsWithinScheme(
  valueIds: string[],
  weightByValueId: Map<string, number>,
  graph: ClassificationGraph,
): void {
  let result: void = undefined;

  // 浅い側から処理すると、多段の親タグでも最終的に最深の子タグへ重みが集まる
  const orderedValueIds = [...valueIds].sort((leftId, rightId) => {
    let compareResult =
      getAncestorValueIds(leftId, graph).size - getAncestorValueIds(rightId, graph).size;
    if (compareResult !== 0) {
      return compareResult;
    }

    compareResult = compareValueIdDisplayOrder(leftId, rightId, graph);
    return compareResult;
  });
  const taggedValueIds = new Set(valueIds);

  // 祖先は必ず子孫より前に処理されるため、除去済みの値が再び対象になることはない
  for (const valueId of orderedValueIds) {
    const descendantIds = getNearestTaggedDescendantIds(
      valueId,
      taggedValueIds,
      graph,
    );
    if (descendantIds.length === 0) {
      continue;
    }

    // 共有葉（多親）への吸収は資産クラス親の構成比を壊すため移譲しない
    if (descendantIds.some((descendantId) => isMultiParentValue(descendantId, graph))) {
      continue;
    }

    const ancestorWeight = readTagWeight(weightByValueId, valueId);
    weightByValueId.delete(valueId);
    taggedValueIds.delete(valueId);

    let descendantTotal = 0;
    for (const descendantId of descendantIds) {
      descendantTotal += readTagWeight(weightByValueId, descendantId);
    }

    for (const descendantId of descendantIds) {
      const share =
        descendantTotal > 0
          ? readTagWeight(weightByValueId, descendantId) / descendantTotal
          : 1 / descendantIds.length;
      weightByValueId.set(descendantId, ancestorWeight * share);
    }
  }

  return result;
}

export function resolveHierarchyTagWeights(
  weights: HierarchyTagWeight[],
  graph: ClassificationGraph,
): HierarchyTagWeight[] {
  let result: HierarchyTagWeight[] = [];
  const weightByValueId = new Map<string, number>();
  const valueIdsBySchemeId = new Map<string, string[]>();

  for (const weight of weights) {
    const value = graph.valuesById.get(weight.valueId);
    if (!value) {
      continue;
    }

    weightByValueId.set(weight.valueId, weight.weight);
    const schemeValueIds = valueIdsBySchemeId.get(value.schemeId) ?? [];
    schemeValueIds.push(weight.valueId);
    valueIdsBySchemeId.set(value.schemeId, schemeValueIds);
  }

  // 軸をまたいだ重み移動は分類軸ごとの構成比を壊すため、同一軸内だけで処理する
  for (const schemeValueIds of valueIdsBySchemeId.values()) {
    transferAncestorWeightsWithinScheme(schemeValueIds, weightByValueId, graph);
  }

  for (const weight of weights) {
    if (!graph.valuesById.has(weight.valueId)) {
      result.push(weight);
      continue;
    }

    const resolvedWeight = weightByValueId.get(weight.valueId);
    if (resolvedWeight === undefined) {
      continue;
    }

    result.push({ valueId: weight.valueId, weight: resolvedWeight });
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
  values: ClassificationGraphValue[],
  links: ClassificationValueLinkDto[],
): ClassificationValueDto[] {
  let result: ClassificationValueDto[] = [];
  const graph = buildClassificationGraph(values, links);

  for (const value of values) {
    let dto: ClassificationValueDto = {
      id: value.id,
      code: value.code,
      name: value.name,
      description: value.description ?? null,
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

  const childAllowedIds = getDescendantValueIds(childValueId, graph);
  const childLeafIds = lineLeafIdsByScheme.get(childSchemeCode);
  if (!childLeafIds || childLeafIds.size === 0) {
    return result;
  }

  for (const leafId of childLeafIds) {
    if (childAllowedIds.has(leafId)) {
      result = true;
      return result;
    }
  }

  return result;
}
