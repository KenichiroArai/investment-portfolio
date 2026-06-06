import type { CurrentSnapshotDto, HoldingLineDto } from "./types";

export type AllocationSlice = {
  valueCode: string;
  valueName: string;
  marketValueMinor: number;
  weight: number;
};

export type AllocationByScheme = {
  schemeCode: string;
  schemeName: string;
  totalMarketValueMinor: number;
  slices: AllocationSlice[];
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

export function groupSnapshotLinesByTag(
  lines: HoldingLineDto[],
  schemeCode: string,
): AllocationSlice[] {
  let result: AllocationSlice[] = [];
  const totals = new Map<
    string,
    { valueName: string; marketValueMinor: number }
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
      continue;
    }

    totals.set(tag.valueCode, {
      valueName: tag.valueName,
      marketValueMinor: line.marketValueMinor,
    });
  }

  for (const [valueCode, item] of totals) {
    let slice: AllocationSlice = {
      valueCode,
      valueName: item.valueName,
      marketValueMinor: item.marketValueMinor,
      weight: taggedTotal > 0 ? item.marketValueMinor / taggedTotal : 0,
    };
    result.push(slice);
  }

  result.sort((left, right) => right.marketValueMinor - left.marketValueMinor);
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
