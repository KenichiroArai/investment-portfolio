import {
  buildClassificationGraph,
  getDescendantValueIds,
  getDirectChildIds,
  getRootValueIds,
  type ClassificationGraph,
  type ClassificationGraphValue,
} from "./classification-hierarchy";
import { IDECO_KAKEIBO_METRIC_CODES } from "./holding-line-metrics";
import type { HoldingLineMetricDto } from "./holding-line-metrics";
import { distributeAmountProportionally } from "./rebalance";
import type {
  ClassificationTagDto,
  ClassificationValueLinkDto,
  CurrentSnapshotDto,
  HoldingLineDto,
} from "./types";

function getLineMetricIntegerValue(
  metrics: HoldingLineMetricDto[],
  code: string,
): number {
  let result = 0;
  const metric = metrics.find((item) => item.code === code);

  if (metric?.integerValue !== null && metric?.integerValue !== undefined) {
    result = metric.integerValue;
  }

  return result;
}

function getLineMetricIntegerValueOrNull(
  metrics: HoldingLineMetricDto[],
  code: string,
): number | null {
  let result: number | null = null;
  const metric = metrics.find((item) => item.code === code);

  if (metric?.integerValue !== null && metric?.integerValue !== undefined) {
    result = metric.integerValue;
  }

  return result;
}

export type AllocationSlice = {
  valueCode: string;
  valueName: string;
  sortOrder?: number;
  marketValueMinor: number;
  weight: number;
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
};

export type AllocationLineInSlice = {
  line: HoldingLineDto;
  weightInSlice: number;
  portfolioCode?: string;
  portfolioName?: string;
  attributedMarketValueMinor: number;
  attributedBookValueMinor: number | null;
  attributedUnrealizedGainMinor: number | null;
  attributedUnrealizedGainRate: number | null;
};

export type AllocationSliceWithLines = AllocationSlice & {
  lines: AllocationLineInSlice[];
};

export type AllocationByScheme = {
  schemeCode: string;
  schemeName: string;
  totalMarketValueMinor: number;
  slices: AllocationSlice[];
};

export type AllocationBySchemeWithLines = {
  schemeCode: string;
  schemeName: string;
  totalMarketValueMinor: number;
  slices: AllocationSliceWithLines[];
};

export type GlobalAnalysisPortfolioSlice = {
  portfolioCode: string;
  portfolioName: string;
  asOfDate: string;
  marketValueMinor: number;
  weight: number;
};

export type GlobalAnalysisResult = {
  totalMarketValueMinor: number;
  portfolios: GlobalAnalysisPortfolioSlice[];
  allocations: AllocationByScheme[];
};

function compareAllocationDisplayOrder(
  left: AllocationSlice,
  right: AllocationSlice,
): number {
  /* v8 ignore next */
  let result = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
  if (result !== 0) {
    return result;
  }

  result = left.valueName.localeCompare(right.valueName);
  if (result !== 0) {
    return result;
  }

  result = left.valueCode.localeCompare(right.valueCode);
  return result;
}

export function sumSnapshotMarketValue(lines: HoldingLineDto[]): number {
  let result = 0;

  for (const line of lines) {
    result += line.marketValueMinor;
  }

  return result;
}

export function sumSnapshotBookValue(lines: HoldingLineDto[]): number {
  let result = 0;

  for (const line of lines) {
    if (line.bookValueMinor !== null) {
      result += line.bookValueMinor;
    }
  }

  return result;
}

export function sumSnapshotUnrealizedGainMinor(lines: HoldingLineDto[]): number {
  let result = 0;

  for (const line of lines) {
    result += getLineMetricIntegerValue(
      line.metrics,
      IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
    );
  }

  return result;
}

export function computeSnapshotUnrealizedGainRate(
  unrealizedGainMinor: number,
  bookValueMinor: number,
): number | null {
  let result: number | null = null;

  if (bookValueMinor === 0) {
    return result;
  }

  result = unrealizedGainMinor / bookValueMinor;
  return result;
}

export function computeSliceGainMetrics(lines: HoldingLineDto[]): {
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
} {
  let result = {
    unrealizedGainMinor: null as number | null,
    unrealizedGainRate: null as number | null,
  };

  let gainSum = 0;
  let hasGainData = false;

  for (const line of lines) {
    const gain = getLineMetricIntegerValueOrNull(
      line.metrics,
      IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
    );
    if (gain === null) {
      continue;
    }

    gainSum += gain;
    hasGainData = true;
  }

  if (!hasGainData) {
    return result;
  }

  result.unrealizedGainMinor = gainSum;
  result.unrealizedGainRate = computeSnapshotUnrealizedGainRate(
    gainSum,
    sumSnapshotBookValue(lines),
  );
  return result;
}

export type SchemeTagAllocation = {
  tag: ClassificationTagDto;
  weight: number;
};

export function listSchemeTagAllocations(
  tags: ClassificationTagDto[],
  schemeCode: string,
): SchemeTagAllocation[] {
  let result: SchemeTagAllocation[] = [];
  const schemeTags = tags.filter((item) => item.schemeCode === schemeCode);

  if (schemeTags.length === 0) {
    return result;
  }

  if (schemeTags.length === 1) {
    result = [{ tag: schemeTags[0]!, weight: 1 }];
    return result;
  }

  let total = 0;
  for (const tag of schemeTags) {
    const rawWeight = tag.allocationWeight;
    if (
      rawWeight === null ||
      rawWeight === undefined ||
      !Number.isFinite(rawWeight) ||
      rawWeight <= 0
    ) {
      continue;
    }
    total += rawWeight;
  }

  if (total <= 0 || !Number.isFinite(total)) {
    const equalWeight = 1 / schemeTags.length;
    for (const tag of schemeTags) {
      result.push({ tag, weight: equalWeight });
    }
    return result;
  }

  for (const tag of schemeTags) {
    const rawWeight = tag.allocationWeight;
    if (
      rawWeight === null ||
      rawWeight === undefined ||
      !Number.isFinite(rawWeight) ||
      rawWeight <= 0
    ) {
      continue;
    }
    result.push({ tag, weight: rawWeight / total });
  }

  return result;
}

function attributeLineAmountsByTagAllocations(
  tagAllocations: SchemeTagAllocation[],
  amountMinor: number,
): Map<string, number> {
  let result = new Map<string, number>();
  const weights = tagAllocations.map((allocation) => ({
    key: allocation.tag.valueCode,
    weight: allocation.weight,
  }));

  /* v8 ignore start */
  if (weights.length === 0) {
    return result;
  }
  /* v8 ignore stop */

  if (amountMinor === 0) {
    for (const allocation of tagAllocations) {
      result.set(allocation.tag.valueCode, 0);
    }
    return result;
  }

  result = distributeAmountProportionally(weights, amountMinor);
  return result;
}

type LineTagAttribution = {
  tag: ClassificationTagDto;
  marketValueMinor: number;
  gainMinor: number | null;
  bookValueMinor: number | null;
};

function buildLineTagAttributions(
  line: HoldingLineDto,
  tagAllocations: SchemeTagAllocation[],
): LineTagAttribution[] {
  let result: LineTagAttribution[] = [];
  const marketValueByTag = attributeLineAmountsByTagAllocations(
    tagAllocations,
    line.marketValueMinor,
  );
  const gain = getLineMetricIntegerValueOrNull(
    line.metrics,
    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
  );
  const gainByTag =
    gain !== null
      ? attributeLineAmountsByTagAllocations(tagAllocations, gain)
      : null;
  const bookValueByTag =
    line.bookValueMinor !== null
      ? attributeLineAmountsByTagAllocations(tagAllocations, line.bookValueMinor)
      : null;

  for (const allocation of tagAllocations) {
    const valueCode = allocation.tag.valueCode;
    /* v8 ignore next */
    const marketValueMinor = marketValueByTag.get(valueCode) ?? 0;
    if (!Number.isFinite(marketValueMinor) || marketValueMinor < 0) {
      continue;
    }

    result.push({
      tag: allocation.tag,
      marketValueMinor,
      gainMinor: gainByTag?.get(valueCode) ?? null,
      bookValueMinor: bookValueByTag?.get(valueCode) ?? null,
    });
  }

  return result;
}

type AttributedGainEntry = {
  attributedGainMinor: number | null;
  attributedBookValueMinor: number | null;
};

function computeAttributedSliceGainMetrics(lines: AttributedGainEntry[]): {
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
} {
  let result = {
    unrealizedGainMinor: null as number | null,
    unrealizedGainRate: null as number | null,
  };

  let gainSum = 0;
  let bookValueSum = 0;
  let hasGainData = false;

  for (const entry of lines) {
    if (entry.attributedGainMinor === null) {
      continue;
    }

    gainSum += entry.attributedGainMinor;
    if (entry.attributedBookValueMinor !== null) {
      bookValueSum += entry.attributedBookValueMinor;
    }
    hasGainData = true;
  }

  if (!hasGainData) {
    return result;
  }

  result.unrealizedGainMinor = gainSum;
  result.unrealizedGainRate = computeSnapshotUnrealizedGainRate(gainSum, bookValueSum);
  return result;
}

export function groupSnapshotLinesByTag(
  lines: HoldingLineDto[],
  schemeCode: string,
): AllocationSlice[] {
  let result: AllocationSlice[] = [];
  const totals = new Map<
    string,
    {
      valueName: string;
      sortOrder: number;
      marketValueMinor: number;
      lines: AttributedGainEntry[];
    }
  >();
  let taggedTotal = 0;

  for (const line of lines) {
    const tagAllocations = listSchemeTagAllocations(line.tags, schemeCode);
    if (tagAllocations.length === 0) {
      continue;
    }

    const attributions = buildLineTagAttributions(line, tagAllocations);
    for (const attribution of attributions) {
      taggedTotal += attribution.marketValueMinor;
      const gainEntry: AttributedGainEntry = {
        attributedGainMinor: attribution.gainMinor,
        attributedBookValueMinor: attribution.bookValueMinor,
      };
      const existing = totals.get(attribution.tag.valueCode);
      if (existing) {
        existing.marketValueMinor += attribution.marketValueMinor;
        existing.lines.push(gainEntry);
        continue;
      }

      totals.set(attribution.tag.valueCode, {
        valueName: attribution.tag.valueName,
        sortOrder: attribution.tag.sortOrder ?? 0,
        marketValueMinor: attribution.marketValueMinor,
        lines: [gainEntry],
      });
    }
  }

  for (const [valueCode, item] of totals) {
    const gainMetrics = computeAttributedSliceGainMetrics(item.lines);
    let slice: AllocationSlice = {
      valueCode,
      valueName: item.valueName,
      sortOrder: item.sortOrder,
      marketValueMinor: item.marketValueMinor,
      weight: taggedTotal > 0 ? item.marketValueMinor / taggedTotal : 0,
      unrealizedGainMinor: gainMetrics.unrealizedGainMinor,
      unrealizedGainRate: gainMetrics.unrealizedGainRate,
    };
    result.push(slice);
  }

  result.sort(compareAllocationDisplayOrder);
  return result;
}

type TaggedLineContext = {
  line: HoldingLineDto;
  portfolioCode?: string;
  portfolioName?: string;
};

function buildAllocationLineInSlice(
  line: HoldingLineDto,
  attribution: LineTagAttribution,
  context: TaggedLineContext,
  weightInSlice: number,
): AllocationLineInSlice {
  let result: AllocationLineInSlice = {
    line,
    weightInSlice,
    portfolioCode: context.portfolioCode,
    portfolioName: context.portfolioName,
    attributedMarketValueMinor: attribution.marketValueMinor,
    attributedBookValueMinor: attribution.bookValueMinor,
    attributedUnrealizedGainMinor: attribution.gainMinor,
    attributedUnrealizedGainRate: null,
  };

  if (
    attribution.gainMinor !== null &&
    attribution.bookValueMinor !== null
  ) {
    result.attributedUnrealizedGainRate = computeSnapshotUnrealizedGainRate(
      attribution.gainMinor,
      attribution.bookValueMinor,
    );
  }

  return result;
}

function groupTaggedLinesByTagWithLines(
  taggedLines: TaggedLineContext[],
  schemeCode: string,
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];
  const totals = new Map<
    string,
    {
      valueName: string;
      sortOrder: number;
      marketValueMinor: number;
      lines: AllocationLineInSlice[];
    }
  >();
  let taggedTotal = 0;

  for (const taggedLine of taggedLines) {
    const tagAllocations = listSchemeTagAllocations(
      taggedLine.line.tags,
      schemeCode,
    );
    if (tagAllocations.length === 0) {
      continue;
    }

    const attributions = buildLineTagAttributions(taggedLine.line, tagAllocations);
    for (const attribution of attributions) {
      taggedTotal += attribution.marketValueMinor;
      const existing = totals.get(attribution.tag.valueCode);
      const lineInSlice = buildAllocationLineInSlice(
        taggedLine.line,
        attribution,
        taggedLine,
        0,
      );
      if (existing) {
        existing.marketValueMinor += attribution.marketValueMinor;
        existing.lines.push(lineInSlice);
        continue;
      }

      totals.set(attribution.tag.valueCode, {
        valueName: attribution.tag.valueName,
        sortOrder: attribution.tag.sortOrder ?? 0,
        marketValueMinor: attribution.marketValueMinor,
        lines: [lineInSlice],
      });
    }
  }

  for (const [valueCode, item] of totals) {
    const sliceMarketValueMinor = item.marketValueMinor;
    for (const lineInSlice of item.lines) {
      lineInSlice.weightInSlice =
        sliceMarketValueMinor > 0
          ? lineInSlice.attributedMarketValueMinor / sliceMarketValueMinor
          : 0;
    }

    item.lines.sort(
      (left, right) =>
        right.attributedMarketValueMinor - left.attributedMarketValueMinor,
    );

    const gainMetrics = computeAttributedSliceGainMetrics(
      item.lines.map((lineInSlice) => ({
        attributedGainMinor: lineInSlice.attributedUnrealizedGainMinor,
        attributedBookValueMinor: lineInSlice.attributedBookValueMinor,
      })),
    );
    let slice: AllocationSliceWithLines = {
      valueCode,
      valueName: item.valueName,
      sortOrder: item.sortOrder,
      marketValueMinor: sliceMarketValueMinor,
      weight: taggedTotal > 0 ? sliceMarketValueMinor / taggedTotal : 0,
      unrealizedGainMinor: gainMetrics.unrealizedGainMinor,
      unrealizedGainRate: gainMetrics.unrealizedGainRate,
      lines: item.lines,
    };
    result.push(slice);
  }

  result.sort(compareAllocationDisplayOrder);
  return result;
}

export function groupSnapshotLinesByTagWithLines(
  lines: HoldingLineDto[],
  schemeCode: string,
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];
  const taggedLines: TaggedLineContext[] = [];

  for (const line of lines) {
    taggedLines.push({ line });
  }

  result = groupTaggedLinesByTagWithLines(taggedLines, schemeCode);
  return result;
}

export function buildAllocationByScheme(
  lines: HoldingLineDto[],
  schemeCode: string,
  schemeName: string,
): AllocationByScheme {
  let result: AllocationByScheme = {
    schemeCode,
    schemeName,
    totalMarketValueMinor: 0,
    slices: [],
  };

  result.slices = groupSnapshotLinesByTag(lines, schemeCode);
  for (const slice of result.slices) {
    result.totalMarketValueMinor += slice.marketValueMinor;
  }

  return result;
}

export function buildAllocationBySchemeWithLines(
  lines: HoldingLineDto[],
  schemeCode: string,
  schemeName: string,
): AllocationBySchemeWithLines {
  let result: AllocationBySchemeWithLines = {
    schemeCode,
    schemeName,
    totalMarketValueMinor: 0,
    slices: [],
  };

  result.slices = groupSnapshotLinesByTagWithLines(lines, schemeCode);
  for (const slice of result.slices) {
    result.totalMarketValueMinor += slice.marketValueMinor;
  }

  return result;
}

export function buildAllocationBySchemeWithLinesFromSnapshots(
  snapshots: CurrentSnapshotDto[],
  schemeCode: string,
  schemeName: string,
): AllocationBySchemeWithLines {
  let result: AllocationBySchemeWithLines = {
    schemeCode,
    schemeName,
    totalMarketValueMinor: 0,
    slices: [],
  };
  const taggedLines: TaggedLineContext[] = [];

  for (const snapshot of snapshots) {
    for (const line of snapshot.lines) {
      taggedLines.push({
        line,
        portfolioCode: snapshot.portfolioCode,
        portfolioName: snapshot.portfolioName,
      });
    }
  }

  result.slices = groupTaggedLinesByTagWithLines(taggedLines, schemeCode);
  for (const slice of result.slices) {
    result.totalMarketValueMinor += slice.marketValueMinor;
  }

  return result;
}

export type HierarchyAllocationOptions = {
  parentValueId?: string | null;
  aggregationLevel: "parent" | "leaf";
  includeOrphans: boolean;
  links: ClassificationValueLinkDto[];
  schemeValues: ClassificationGraphValue[];
  schemeId: string;
};

function buildValueCodeBySchemeCodeMap(
  schemeValues: ClassificationGraphValue[],
): Map<string, Map<string, string>> {
  let result = new Map<string, Map<string, string>>();

  for (const value of schemeValues) {
    const codeMap = result.get(value.schemeCode) ?? new Map<string, string>();
    codeMap.set(value.code, value.id);
    result.set(value.schemeCode, codeMap);
  }

  return result;
}

function getLineLeafValueIdsBySchemeFromTags(
  tags: ClassificationTagDto[],
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

function shouldIncludeOrphanValue(
  valueId: string,
  schemeId: string,
  graph: ClassificationGraph,
  includeOrphans: boolean,
): boolean {
  let result = true;

  if (includeOrphans) {
    return result;
  }

  const parentIds = graph.parentIdsByChildId.get(valueId) ?? [];
  if (parentIds.length > 0) {
    return result;
  }

  const value = graph.valuesById.get(valueId);
  if (!value || value.schemeId !== schemeId) {
    return result;
  }

  // 階層の頂点（非葉ルート）は残し、親も子もない孤立葉だけ除外する
  if (graph.leafValueIds.has(valueId)) {
    result = false;
  }

  return result;
}

function compareGraphValueDisplayOrder(
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

  result = left.sortOrder - right.sortOrder;
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

function resolveHierarchyDisplayValueIds(
  graph: ClassificationGraph,
  schemeId: string,
  options: HierarchyAllocationOptions,
): string[] {
  let result: string[] = [];

  if (options.parentValueId) {
    // 親直付けタグの残差用に、ドリルダウン中は親自身も含める
    result = [options.parentValueId, ...getDirectChildIds(options.parentValueId, graph)];
    return result;
  }

  if (options.aggregationLevel === "parent") {
    result = getRootValueIds(schemeId, graph);
    return result;
  }

  // 葉単位: 葉に加え、親タグ直付けを残すため同一軸の非葉も含める
  for (const value of graph.valuesById.values()) {
    if (value.schemeId !== schemeId) {
      continue;
    }
    result.push(value.id);
  }

  result.sort((leftId, rightId) => compareGraphValueDisplayOrder(leftId, rightId, graph));
  return result;
}

function isProperDescendantValue(
  ancestorValueId: string,
  descendantValueId: string,
  graph: ClassificationGraph,
): boolean {
  let result = false;

  if (ancestorValueId === descendantValueId) {
    return result;
  }

  result = getDescendantValueIds(ancestorValueId, graph).has(descendantValueId);
  return result;
}

function pickMostSpecificDisplayValueIds(
  taggedValueId: string,
  displayValueIds: string[],
  graph: ClassificationGraph,
): string[] {
  let result: string[] = [];
  const coveringIds = displayValueIds.filter((displayValueId) =>
    getDescendantValueIds(displayValueId, graph).has(taggedValueId),
  );

  for (const candidateId of coveringIds) {
    const hasMoreSpecific = coveringIds.some(
      (otherId) =>
        otherId !== candidateId && isProperDescendantValue(candidateId, otherId, graph),
    );
    if (hasMoreSpecific) {
      continue;
    }
    result.push(candidateId);
  }

  return result;
}

function lineTaggedValueMatchesDisplayUnit(
  taggedValueIds: Set<string>,
  displayValueId: string,
  displayValueIds: string[],
  graph: ClassificationGraph,
): boolean {
  let result = false;

  for (const taggedValueId of taggedValueIds) {
    const mostSpecificIds = pickMostSpecificDisplayValueIds(
      taggedValueId,
      displayValueIds,
      graph,
    );
    if (mostSpecificIds.includes(displayValueId)) {
      result = true;
      return result;
    }
  }

  return result;
}

function lineMatchesDisplayUnit(
  lineTaggedIdsByScheme: Map<string, Set<string>>,
  displayValueId: string,
  displayValueIds: string[],
  contextParentValueId: string | null | undefined,
  graph: ClassificationGraph,
): boolean {
  let result = false;
  const displayValue = graph.valuesById.get(displayValueId);
  /* v8 ignore start */
  if (!displayValue) {
    return result;
  }
  /* v8 ignore stop */

  if (contextParentValueId) {
    const contextValue = graph.valuesById.get(contextParentValueId);
    /* v8 ignore start */
    if (!contextValue) {
      return result;
    }
    /* v8 ignore stop */

    const contextAllowedIds = getDescendantValueIds(contextParentValueId, graph);
    const contextTaggedIds = lineTaggedIdsByScheme.get(contextValue.schemeCode);
    if (!contextTaggedIds) {
      return result;
    }

    let matchesContext = false;
    for (const taggedId of contextTaggedIds) {
      if (contextAllowedIds.has(taggedId)) {
        matchesContext = true;
        break;
      }
    }

    if (!matchesContext) {
      return result;
    }
  }

  const displayTaggedIds = lineTaggedIdsByScheme.get(displayValue.schemeCode);
  if (!displayTaggedIds) {
    return result;
  }

  result = lineTaggedValueMatchesDisplayUnit(
    displayTaggedIds,
    displayValueId,
    displayValueIds,
    graph,
  );
  return result;
}

function attributionMatchesDisplayUnit(
  attribution: LineTagAttribution,
  displayValueId: string,
  displayValueIds: string[],
  valueCodeBySchemeCode: Map<string, Map<string, string>>,
  graph: ClassificationGraph,
): boolean {
  let result = false;
  const codeMap = valueCodeBySchemeCode.get(attribution.tag.schemeCode);
  if (!codeMap) {
    return result;
  }

  const taggedValueId = codeMap.get(attribution.tag.valueCode);
  if (!taggedValueId) {
    return result;
  }

  const mostSpecificIds = pickMostSpecificDisplayValueIds(
    taggedValueId,
    displayValueIds,
    graph,
  );
  result = mostSpecificIds.includes(displayValueId);
  return result;
}

export function buildHierarchicalAllocationBySchemeWithLines(
  lines: HoldingLineDto[],
  schemeCode: string,
  schemeName: string,
  options: HierarchyAllocationOptions,
): AllocationBySchemeWithLines {
  let result: AllocationBySchemeWithLines = {
    schemeCode,
    schemeName,
    totalMarketValueMinor: 0,
    slices: [],
  };

  if (options.links.length === 0) {
    result = buildAllocationBySchemeWithLines(lines, schemeCode, schemeName);
    return result;
  }

  const graph = buildClassificationGraph(options.schemeValues, options.links);
  const valueCodeBySchemeCode = buildValueCodeBySchemeCodeMap(options.schemeValues);
  const displayValueIds = resolveHierarchyDisplayValueIds(
    graph,
    options.schemeId,
    options,
  ).filter((valueId) =>
    shouldIncludeOrphanValue(valueId, options.schemeId, graph, options.includeOrphans),
  );

  const totals = new Map<
    string,
    {
      valueName: string;
      sortOrder: number;
      marketValueMinor: number;
      lines: AllocationLineInSlice[];
    }
  >();

  for (const line of lines) {
    const tagAllocations = listSchemeTagAllocations(line.tags, schemeCode);
    if (tagAllocations.length === 0) {
      continue;
    }

    const attributions = buildLineTagAttributions(line, tagAllocations);
    const lineTaggedIdsByScheme = getLineLeafValueIdsBySchemeFromTags(
      line.tags,
      valueCodeBySchemeCode,
    );

    for (const displayValueId of displayValueIds) {
      if (
        !lineMatchesDisplayUnit(
          lineTaggedIdsByScheme,
          displayValueId,
          displayValueIds,
          options.parentValueId,
          graph,
        )
      ) {
        continue;
      }

      const displayValue = graph.valuesById.get(displayValueId);
      /* v8 ignore start */
      if (!displayValue) {
        continue;
      }
      /* v8 ignore stop */

      for (const attribution of attributions) {
        if (
          !attributionMatchesDisplayUnit(
            attribution,
            displayValueId,
            displayValueIds,
            valueCodeBySchemeCode,
            graph,
          )
        ) {
          continue;
        }

        const lineInSlice = buildAllocationLineInSlice(
          line,
          attribution,
          { line },
          0,
        );
        const existing = totals.get(displayValue.code);
        if (existing) {
          existing.marketValueMinor += attribution.marketValueMinor;
          existing.lines.push(lineInSlice);
          continue;
        }

        totals.set(displayValue.code, {
          valueName: displayValue.name,
          sortOrder: displayValue.sortOrder,
          marketValueMinor: attribution.marketValueMinor,
          lines: [lineInSlice],
        });
      }
    }
  }

  let taggedTotal = 0;
  for (const item of totals.values()) {
    taggedTotal += item.marketValueMinor;
  }

  for (const [valueCode, item] of totals) {
    const sliceMarketValueMinor = item.marketValueMinor;
    for (const lineInSlice of item.lines) {
      lineInSlice.weightInSlice =
        sliceMarketValueMinor > 0
          ? lineInSlice.attributedMarketValueMinor / sliceMarketValueMinor
          : 0;
    }

    item.lines.sort(
      (left, right) =>
        right.attributedMarketValueMinor - left.attributedMarketValueMinor,
    );

    const gainMetrics = computeAttributedSliceGainMetrics(
      item.lines.map((lineInSlice) => ({
        attributedGainMinor: lineInSlice.attributedUnrealizedGainMinor,
        attributedBookValueMinor: lineInSlice.attributedBookValueMinor,
      })),
    );

    let slice: AllocationSliceWithLines = {
      valueCode,
      valueName: item.valueName,
      sortOrder: item.sortOrder,
      marketValueMinor: sliceMarketValueMinor,
      weight: taggedTotal > 0 ? sliceMarketValueMinor / taggedTotal : 0,
      unrealizedGainMinor: gainMetrics.unrealizedGainMinor,
      unrealizedGainRate: gainMetrics.unrealizedGainRate,
      lines: item.lines,
    };
    result.slices.push(slice);
    result.totalMarketValueMinor += sliceMarketValueMinor;
  }

  result.slices.sort(compareAllocationDisplayOrder);
  return result;
}

export function mergeSnapshotsForGlobalAnalysis(
  snapshots: CurrentSnapshotDto[],
  schemeConfigs: { schemeCode: string; schemeName: string }[],
): GlobalAnalysisResult {
  let result: GlobalAnalysisResult = {
    totalMarketValueMinor: 0,
    portfolios: [],
    allocations: [],
  };

  const mergedLines: HoldingLineDto[] = [];

  for (const snapshot of snapshots) {
    const marketValueMinor = sumSnapshotMarketValue(snapshot.lines);
    result.totalMarketValueMinor += marketValueMinor;
    mergedLines.push(...snapshot.lines);

    let portfolioSlice: GlobalAnalysisPortfolioSlice = {
      portfolioCode: snapshot.portfolioCode,
      portfolioName: snapshot.portfolioName,
      asOfDate: snapshot.asOfDate,
      marketValueMinor,
      weight: 0,
    };
    result.portfolios.push(portfolioSlice);
  }

  for (const portfolio of result.portfolios) {
    portfolio.weight =
      result.totalMarketValueMinor > 0
        ? portfolio.marketValueMinor / result.totalMarketValueMinor
        : 0;
  }

  result.portfolios.sort(
    (left, right) => right.marketValueMinor - left.marketValueMinor,
  );

  for (const config of schemeConfigs) {
    let allocation = buildAllocationByScheme(
      mergedLines,
      config.schemeCode,
      config.schemeName,
    );
    result.allocations.push(allocation);
  }

  return result;
}
