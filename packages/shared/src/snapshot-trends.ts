import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
} from "./portfolio-snapshot-metrics";
import { comparePortfolioInstrumentOrder } from "./portfolio-allocation";
import {
  buildAllocationBySchemeWithLines,
  sumSnapshotBookValue,
  sumSnapshotMarketValue,
} from "./snapshot-allocation";
import {
  PORTFOLIO_INSTRUMENT_SCHEME_CODE,
  PORTFOLIO_INSTRUMENT_SCHEME_NAME,
} from "./portfolio-instrument-scheme";
import type { CurrentSnapshotDto } from "./types";

export { PORTFOLIO_INSTRUMENT_SCHEME_CODE, PORTFOLIO_INSTRUMENT_SCHEME_NAME } from "./portfolio-instrument-scheme";

export type SnapshotTrendAllocationSlice = {
  valueCode: string;
  valueName: string;
  marketValueMinor: number;
  ratio: number;
  sortOrder?: number | null;
};

export type SnapshotTrendPointDto = {
  asOfDate: string;
  totalMarketValueMinor: number;
  totalBookValueMinor: number;
  unrealizedGainMinor: number;
  gainRateOnBook: number | null;
  totalContributionsMinor: number | null;
  gainRateOnContributions: number | null;
  allocationsByScheme: Record<string, SnapshotTrendAllocationSlice[]>;
};

export type SnapshotTrendsDto = {
  portfolioCode: string;
  from: string;
  to: string;
  points: SnapshotTrendPointDto[];
};

export type BuildSnapshotTrendPointOptions = {
  schemeCodes?: string[];
};

function buildAllocationSlicesForScheme(
  snapshot: CurrentSnapshotDto,
  schemeCode: string,
): SnapshotTrendAllocationSlice[] {
  let result: SnapshotTrendAllocationSlice[] = [];
  const scheme = snapshot.analysisSchemes.find(
    (item) => item.schemeCode === schemeCode,
  );
  const schemeName = scheme?.schemeName ?? schemeCode;
  const allocation = buildAllocationBySchemeWithLines(
    snapshot.lines,
    schemeCode,
    schemeName,
  );
  result = allocation.slices.map((slice) => {
    let item: SnapshotTrendAllocationSlice = {
      valueCode: slice.valueCode,
      valueName: slice.valueName,
      marketValueMinor: slice.marketValueMinor,
      ratio: slice.weight,
    };
    return item;
  });
  return result;
}

export function buildInstrumentAllocationSlices(
  snapshot: CurrentSnapshotDto,
): SnapshotTrendAllocationSlice[] {
  let result: SnapshotTrendAllocationSlice[] = [];

  const totalMarketValueMinor = sumSnapshotMarketValue(snapshot.lines);
  const sortedLines = [...snapshot.lines].sort(comparePortfolioInstrumentOrder);

  for (const line of sortedLines) {
    const ratio =
      totalMarketValueMinor > 0 ? line.marketValueMinor / totalMarketValueMinor : 0;
    let slice: SnapshotTrendAllocationSlice = {
      valueCode: line.instrumentId,
      valueName: line.instrumentName,
      marketValueMinor: line.marketValueMinor,
      ratio,
      sortOrder: line.sortOrder,
    };
    result.push(slice);
  }

  return result;
}

export function buildSnapshotTrendPoint(
  snapshot: CurrentSnapshotDto,
  options?: BuildSnapshotTrendPointOptions,
): SnapshotTrendPointDto {
  let result: SnapshotTrendPointDto = {
    asOfDate: snapshot.asOfDate,
    totalMarketValueMinor: 0,
    totalBookValueMinor: 0,
    unrealizedGainMinor: 0,
    gainRateOnBook: null,
    totalContributionsMinor: null,
    gainRateOnContributions: null,
    allocationsByScheme: {},
  };

  const totalMarketValueMinor = sumSnapshotMarketValue(snapshot.lines);
  const totalBookValueMinor = sumSnapshotBookValue(snapshot.lines);
  const unrealizedGainMinor = totalMarketValueMinor - totalBookValueMinor;
  const totalContributionsMinor = resolveSnapshotTotalContributions(snapshot);
  const hasContributionsMetric = snapshot.metrics.some(
    (metric) => metric.code === "ideco_total_contributions",
  );

  const schemeCodes =
    options?.schemeCodes ??
    snapshot.analysisSchemes.map((scheme) => scheme.schemeCode);
  const allocationsByScheme: Record<string, SnapshotTrendAllocationSlice[]> = {};
  for (const schemeCode of schemeCodes) {
    allocationsByScheme[schemeCode] = buildAllocationSlicesForScheme(
      snapshot,
      schemeCode,
    );
  }
  allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE] =
    buildInstrumentAllocationSlices(snapshot);

  result = {
    asOfDate: snapshot.asOfDate,
    totalMarketValueMinor,
    totalBookValueMinor,
    unrealizedGainMinor,
    gainRateOnBook: computeSnapshotGainRate(
      unrealizedGainMinor,
      totalBookValueMinor,
    ),
    totalContributionsMinor: hasContributionsMetric ? totalContributionsMinor : null,
    gainRateOnContributions: hasContributionsMetric
      ? computeSnapshotGainRate(
          computeSnapshotPortfolioGainMinor(
            totalMarketValueMinor,
            totalContributionsMinor,
          ),
          totalContributionsMinor,
        )
      : null,
    allocationsByScheme,
  };
  return result;
}

export function buildSnapshotTrends(
  portfolioCode: string,
  snapshots: CurrentSnapshotDto[],
  from: string,
  to: string,
): SnapshotTrendsDto {
  let result: SnapshotTrendsDto = {
    portfolioCode,
    from,
    to,
    points: [],
  };

  const filtered = [...snapshots]
    .filter((snapshot) => snapshot.asOfDate >= from && snapshot.asOfDate <= to)
    .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate));

  const points = filtered.map((snapshot) => buildSnapshotTrendPoint(snapshot));
  result = {
    portfolioCode,
    from,
    to,
    points,
  };
  return result;
}
