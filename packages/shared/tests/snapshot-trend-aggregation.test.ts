import { describe, expect, it } from "vitest";

import {
  aggregateTrendPoints,
  formatTrendBucketLabel,
  resolveTrendDisplayUnit,
} from "../src/snapshot-trend-aggregation";
import type { SnapshotTrendPointDto } from "../src/snapshot-trends";

function createPoint(asOfDate: string, marketValue: number): SnapshotTrendPointDto {
  let result: SnapshotTrendPointDto = {
    asOfDate,
    totalMarketValueMinor: marketValue,
    totalBookValueMinor: marketValue - 1000,
    unrealizedGainMinor: 1000,
    gainRateOnBook: 0.01,
    totalContributionsMinor: null,
    gainRateOnContributions: null,
    allocationsByScheme: {},
  };
  return result;
}

describe("snapshot-trend-aggregation", () => {
  it("resolves display unit from preset", () => {
    expect(resolveTrendDisplayUnit("1w")).toBe("day");
    expect(resolveTrendDisplayUnit("1m")).toBe("month");
    expect(resolveTrendDisplayUnit("all")).toBe("month");
  });

  it("aggregates by month using latest as-of date in each month", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
      createPoint("2026-07-01", 300),
    ];
    const aggregated = aggregateTrendPoints(points, "month");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-06",
      bucketLabel: "2026年6月",
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 200,
    });
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-07",
      sourceAsOfDate: "2026-07-01",
      totalMarketValueMinor: 300,
    });
  });

  it("keeps daily points when unit is day", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
    ];
    const aggregated = aggregateTrendPoints(points, "day");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0].bucketLabel).toBe("2026/6/2");
    expect(aggregated[1].bucketLabel).toBe("2026/6/7");
  });

  it("formats bucket labels", () => {
    expect(formatTrendBucketLabel("2026-06", "month")).toBe("2026年6月");
    expect(formatTrendBucketLabel("2026-06-07", "day")).toBe("2026/6/7");
  });
});
