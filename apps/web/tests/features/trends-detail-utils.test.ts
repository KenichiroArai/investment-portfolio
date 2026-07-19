import { describe, expect, it } from "vitest";

import type { AggregatedTrendPoint, SnapshotTrendPointDto } from "@repo/shared";

import { resolvePeriodEndpoints } from "@/features/trends/trends-detail-utils";

function makePoint(
  asOfDate: string,
  totalMarketValueMinor: number,
): SnapshotTrendPointDto {
  let result: SnapshotTrendPointDto = {
    asOfDate,
    totalMarketValueMinor,
    totalBookValueMinor: totalMarketValueMinor,
    unrealizedGainMinor: 0,
    gainRateOnBook: 0,
    totalContributionsMinor: null,
    gainRateOnContributions: null,
    allocationsByScheme: {},
  };
  return result;
}

function makeBaseline(asOfDate: string): AggregatedTrendPoint {
  const point = makePoint(asOfDate, 1_000_000);
  let result: AggregatedTrendPoint = {
    ...point,
    bucketKey: asOfDate,
    bucketLabel: asOfDate,
    sourceAsOfDate: asOfDate,
  };
  return result;
}

describe("resolvePeriodEndpoints", () => {
  it("uses first and last in-range raw points regardless of aggregation", () => {
    const points = [
      makePoint("2026-06-02", 1_000_000),
      makePoint("2026-06-10", 1_100_000),
      makePoint("2026-06-20", 1_200_000),
      makePoint("2026-07-19", 1_300_000),
      makePoint("2026-08-01", 1_400_000),
    ];

    const endpoints = resolvePeriodEndpoints(
      points,
      "2026-06-02",
      "2026-07-19",
      null,
    );

    expect(endpoints).not.toBeNull();
    expect(endpoints?.start.sourceAsOfDate).toBe("2026-06-02");
    expect(endpoints?.start.totalMarketValueMinor).toBe(1_000_000);
    expect(endpoints?.end.sourceAsOfDate).toBe("2026-07-19");
    expect(endpoints?.end.totalMarketValueMinor).toBe(1_300_000);
  });

  it("uses baseline when only one in-range point exists", () => {
    const points = [makePoint("2026-07-19", 1_300_000)];
    const baseline = makeBaseline("2026-06-01");

    const endpoints = resolvePeriodEndpoints(
      points,
      "2026-06-02",
      "2026-07-19",
      baseline,
    );

    expect(endpoints).not.toBeNull();
    expect(endpoints?.start.sourceAsOfDate).toBe("2026-06-01");
    expect(endpoints?.end.sourceAsOfDate).toBe("2026-07-19");
  });

  it("returns null when range has no points", () => {
    const endpoints = resolvePeriodEndpoints(
      [makePoint("2026-05-01", 900_000)],
      "2026-06-02",
      "2026-07-19",
      null,
    );

    expect(endpoints).toBeNull();
  });

  it("returns null for a single point without baseline", () => {
    const endpoints = resolvePeriodEndpoints(
      [makePoint("2026-07-19", 1_300_000)],
      "2026-06-02",
      "2026-07-19",
      null,
    );

    expect(endpoints).toBeNull();
  });
});
