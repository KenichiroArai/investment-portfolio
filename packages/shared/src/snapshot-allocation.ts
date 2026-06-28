import { IDECO_KAKEIBO_METRIC_CODES } from "./holding-line-metrics";
import type { HoldingLineMetricDto } from "./holding-line-metrics";
import type { CurrentSnapshotDto, HoldingLineDto } from "./types";

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

export function groupSnapshotLinesByTag(
  lines: HoldingLineDto[],
  schemeCode: string,
): AllocationSlice[] {
  let result: AllocationSlice[] = [];
  const totals = new Map<
    string,
    { valueName: string; marketValueMinor: number; lines: HoldingLineDto[] }
  >();
  let taggedTotal = 0;

  for (const line of lines) {
    const tag = line.tags.find((item) => item.schemeCode === schemeCode);
    if (!tag) {
      continue;
    }

    taggedTotal += line.marketValueMinor;
    const existing = totals.get(tag.valueCode);
    if (existing) {
      existing.marketValueMinor += line.marketValueMinor;
      existing.lines.push(line);
      continue;
    }

    totals.set(tag.valueCode, {
      valueName: tag.valueName,
      marketValueMinor: line.marketValueMinor,
      lines: [line],
    });
  }

  for (const [valueCode, item] of totals) {
    const gainMetrics = computeSliceGainMetrics(item.lines);
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

function groupTaggedLinesByTagWithLines(
  taggedLines: TaggedLineContext[],
  schemeCode: string,
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];
  const totals = new Map<
    string,
    { valueName: string; marketValueMinor: number; lines: AllocationLineInSlice[] }
  >();
  let taggedTotal = 0;

  for (const taggedLine of taggedLines) {
    const tag = taggedLine.line.tags.find(
      (item) => item.schemeCode === schemeCode,
    );
    if (!tag) {
      continue;
    }

    taggedTotal += taggedLine.line.marketValueMinor;
    const existing = totals.get(tag.valueCode);
    if (existing) {
      existing.marketValueMinor += taggedLine.line.marketValueMinor;
      existing.lines.push({
        line: taggedLine.line,
        weightInSlice: 0,
        portfolioCode: taggedLine.portfolioCode,
        portfolioName: taggedLine.portfolioName,
      });
      continue;
    }

    totals.set(tag.valueCode, {
      valueName: tag.valueName,
      marketValueMinor: taggedLine.line.marketValueMinor,
      lines: [
        {
          line: taggedLine.line,
          weightInSlice: 0,
          portfolioCode: taggedLine.portfolioCode,
          portfolioName: taggedLine.portfolioName,
        },
      ],
    });
  }

  for (const [valueCode, item] of totals) {
    const sliceMarketValueMinor = item.marketValueMinor;
    for (const lineInSlice of item.lines) {
      lineInSlice.weightInSlice =
        sliceMarketValueMinor > 0
          ? lineInSlice.line.marketValueMinor / sliceMarketValueMinor
          : 0;
    }

    item.lines.sort(
      (left, right) =>
        right.line.marketValueMinor - left.line.marketValueMinor,
    );

    const gainMetrics = computeSliceGainMetrics(
      item.lines.map((lineInSlice) => lineInSlice.line),
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
