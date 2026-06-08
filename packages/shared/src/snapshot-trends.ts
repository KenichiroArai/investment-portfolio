import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
} from "./portfolio-snapshot-metrics";
import {
  buildAllocationBySchemeWithLines,
  sumSnapshotBookValue,
  sumSnapshotMarketValue,
} from "./snapshot-allocation";
import type { CurrentSnapshotDto } from "./types";

export type SnapshotTrendAllocationSlice = {
  valueCode: string;
  valueName: string;
  marketValueMinor: number;
  ratio: number;
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
