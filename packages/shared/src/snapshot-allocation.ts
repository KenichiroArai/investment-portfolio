import { IDECO_KAKEIBO_METRIC_CODES } from "./holding-line-metrics";
import type { HoldingLineMetricDto } from "./holding-line-metrics";
import { distributeAmountProportionally } from "./rebalance";
import type { ClassificationTagDto, CurrentSnapshotDto, HoldingLineDto } from "./types";

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
    { valueName: string; marketValueMinor: number; lines: AttributedGainEntry[] }
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
      marketValueMinor: item.marketValueMinor,
      weight: taggedTotal > 0 ? item.marketValueMinor / taggedTotal : 0,
      unrealizedGainMinor: gainMetrics.unrealizedGainMinor,
      unrealizedGainRate: gainMetrics.unrealizedGainRate,
    };
    result.push(slice);
  }

  result.sort((left, right) => right.marketValueMinor - left.marketValueMinor);
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
      marketValueMinor: sliceMarketValueMinor,
      weight: taggedTotal > 0 ? sliceMarketValueMinor / taggedTotal : 0,
      unrealizedGainMinor: gainMetrics.unrealizedGainMinor,
      unrealizedGainRate: gainMetrics.unrealizedGainRate,
      lines: item.lines,
    };
    result.push(slice);
  }

  result.sort((left, right) => right.marketValueMinor - left.marketValueMinor);
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
