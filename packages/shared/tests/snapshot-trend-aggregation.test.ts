import { describe, expect, it } from "vitest";

import {
  aggregateTrendPoints,
  buildTrendDisplayPoints,
  formatTrendBucketLabel,
  resolveTrendDisplayUnit,
  resolveTrendDisplayUnitWithFallback,
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
    expect(resolveTrendDisplayUnit({ preset: "1w" })).toBe("day");
    expect(resolveTrendDisplayUnit({ preset: "1m" })).toBe("month");
    expect(resolveTrendDisplayUnit({ preset: "all" })).toBe("month");
  });

  it("resolves display unit for calendar month and custom ranges", () => {
    expect(
      resolveTrendDisplayUnit({
        preset: "all",
        calendarMonth: "2026-06",
      }),
    ).toBe("day");
    expect(
      resolveTrendDisplayUnit({
        preset: "all",
        customFrom: "2026-06-01",
        customTo: "2026-06-14",
      }),
    ).toBe("day");
    expect(
      resolveTrendDisplayUnit({
        preset: "all",
        customFrom: "2026-01-01",
        customTo: "2026-06-01",
      }),
    ).toBe("month");
  });

  it("falls back to day when monthly aggregation yields one bucket", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
    ];
    expect(
      resolveTrendDisplayUnitWithFallback(points, { preset: "1m" }),
    ).toBe("day");
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
    expect(formatTrendBucketLabel("2026-06", "month")).toBe("2026年6月");
    expect(formatTrendBucketLabel("2026-06-07", "day")).toBe("2026/6/7");
    expect(formatTrendBucketLabel("unknown", "month")).toBe("unknown");
    expect(formatTrendBucketLabel("2026-13", "day")).toBe("2026-13");
  });

  it("returns empty aggregation for no points", () => {
    expect(aggregateTrendPoints([], "month")).toEqual([]);
    expect(aggregateTrendPoints([], "day")).toEqual([]);
  });

  it("keeps latest point when month bucket key cannot be derived", () => {
    const points = [
      {
        ...createPoint("invalid-date", 100),
        allocationsByScheme: {},
      },
    ];
    const aggregated = aggregateTrendPoints(points, "month");
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]?.bucketKey).toBe("invalid-date");
  });
});
