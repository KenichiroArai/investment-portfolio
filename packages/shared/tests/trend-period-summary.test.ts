import { describe, expect, it } from "vitest";

import type { AggregatedTrendPoint } from "../src/snapshot-trend-aggregation";
import {
  buildTrendPeriodMetricDeltas,
  computePeriodRelativeRate,
} from "../src/trend-period-summary";

function createPoint(
  overrides: Partial<AggregatedTrendPoint> = {},
): AggregatedTrendPoint {
  let result: AggregatedTrendPoint = {
    asOfDate: "2026-06-07",
    totalMarketValueMinor: 101,
    totalBookValueMinor: 90,
    unrealizedGainMinor: 11,
    gainRateOnBook: 0.15,
    totalContributionsMinor: 1_000_000,
    gainRateOnContributions: 0.05,
    allocationsByScheme: {},
    bucketKey: "2026-06-07",
    bucketLabel: "2026/6/7",
    sourceAsOfDate: "2026-06-07",
    ...overrides,
  };
  return result;
}

describe("computePeriodRelativeRate", () => {
  it("returns start-based relative rate", () => {
    expect(computePeriodRelativeRate(100, 101)).toBeCloseTo(0.01);
  });

  it("returns null when start is zero", () => {
    expect(computePeriodRelativeRate(0, 101)).toBeNull();
  });

  it("uses absolute start as denominator for negative values", () => {
    expect(computePeriodRelativeRate(-100, -50)).toBeCloseTo(0.5);
  });
});

describe("buildTrendPeriodMetricDeltas", () => {
  it("builds yen and percent-point deltas for available metrics", () => {
    const start = createPoint({
      totalMarketValueMinor: 100,
      unrealizedGainMinor: 400_000,
      gainRateOnBook: 0.13,
      gainRateOnContributions: 0.04,
    });
    const end = createPoint({
      totalMarketValueMinor: 101,
      unrealizedGainMinor: 459_121,
      gainRateOnBook: 0.15,
      gainRateOnContributions: 0.05,
    });

    const deltas = buildTrendPeriodMetricDeltas(start, end);

    expect(deltas).toHaveLength(4);
    expect(deltas[0]).toMatchObject({
      key: "market-value",
      absoluteDelta: 1,
      relativeRate: 0.01,
      unit: "yen",
    });
    expect(deltas[2].key).toBe("gain-rate-book");
    expect(deltas[2].absoluteDelta).toBeCloseTo(0.02);
    expect(deltas[2].relativeRate).toBeCloseTo(0.02 / 0.13);
    expect(deltas[2].unit).toBe("percentPoint");
  });

  it("skips contribution gain rate when either endpoint is missing", () => {
    const start = createPoint({ gainRateOnContributions: null });
    const end = createPoint({ gainRateOnContributions: 0.05 });

    const deltas = buildTrendPeriodMetricDeltas(start, end);

    expect(deltas.some((item) => item.key === "gain-rate-contributions")).toBe(false);
  });
});
