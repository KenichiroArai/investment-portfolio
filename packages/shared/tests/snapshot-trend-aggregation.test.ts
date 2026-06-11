import { describe, expect, it } from "vitest";

import {
  aggregateTrendPoints,
  buildTrendDisplayPoints,
  formatTrendBucketLabel,
  readTrendDisplayUnit,
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
  it("reads display unit from query value", () => {
    expect(readTrendDisplayUnit(null)).toBe("day");
    expect(readTrendDisplayUnit("week")).toBe("week");
    expect(readTrendDisplayUnit("3m")).toBe("3m");
    expect(readTrendDisplayUnit("invalid")).toBe("day");
  });

  it("keeps daily points when unit is day", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
    ];
    const aggregated = aggregateTrendPoints(points, "day", "2026-06-01", "2026-06-30");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0].bucketLabel).toBe("2026/6/2");
    expect(aggregated[1].bucketLabel).toBe("2026/6/7");
  });

  it("aggregates by rolling week using latest as-of date in each week", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-05", 150),
      createPoint("2026-06-09", 200),
    ];
    const aggregated = aggregateTrendPoints(points, "week", "2026-06-01", "2026-06-30");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-06-07",
      bucketLabel: "2026/6/7",
      sourceAsOfDate: "2026-06-05",
      totalMarketValueMinor: 150,
    });
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-06-14",
      bucketLabel: "2026/6/14",
      sourceAsOfDate: "2026-06-09",
      totalMarketValueMinor: 200,
    });
  });

  it("aggregates by rolling 1 month using latest as-of date in each bucket", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
      createPoint("2026-07-01", 300),
    ];
    const aggregated = aggregateTrendPoints(points, "1m", "2026-06-01", "2026-07-31");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-06-30",
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 200,
    });
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-07-31",
      sourceAsOfDate: "2026-07-01",
      totalMarketValueMinor: 300,
    });
  });

  it("aggregates by rolling 3 months using latest as-of date in each bucket", () => {
    const points = [
      createPoint("2026-02-10", 100),
      createPoint("2026-05-31", 200),
      createPoint("2026-06-07", 300),
    ];
    const aggregated = aggregateTrendPoints(points, "3m", "2026-01-15", "2026-06-30");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-02-10",
      totalMarketValueMinor: 100,
    });
    expect(aggregated[1]).toMatchObject({
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 300,
    });
  });

  it("splits display points and baseline from fetched range", () => {
    const points = [
      createPoint("2026-05-31", 100),
      createPoint("2026-06-02", 150),
      createPoint("2026-06-07", 200),
    ];
    const built = buildTrendDisplayPoints(points, "day", "2026-06-01", "2026-06-30");
    expect(built.baselinePoint).toMatchObject({
      sourceAsOfDate: "2026-05-31",
      totalMarketValueMinor: 100,
    });
    expect(built.displayPoints).toHaveLength(2);
    expect(built.displayPoints[0]?.sourceAsOfDate).toBe("2026-06-02");
    expect(built.displayPoints[1]?.sourceAsOfDate).toBe("2026-06-07");
  });

  it("formats bucket labels", () => {
    expect(formatTrendBucketLabel("2026-06-07", "day")).toBe("2026/6/7");
    expect(formatTrendBucketLabel("2026-06-07", "week")).toBe("2026/6/7");
    expect(formatTrendBucketLabel("unknown", "1m")).toBe("unknown");
  });

  it("returns empty aggregation for no points", () => {
    expect(aggregateTrendPoints([], "1m", "2026-06-01", "2026-06-30")).toEqual([]);
    expect(aggregateTrendPoints([], "day", "2026-06-01", "2026-06-30")).toEqual([]);
  });
});
