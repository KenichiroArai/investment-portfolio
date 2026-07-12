import { describe, expect, it } from "vitest";

import { mergeSnapshotTrendPoints } from "../src/merge-snapshot-trend-points";
import type { SnapshotTrendPointDto } from "../src/snapshot-trends";

function point(
  asOfDate: string,
  totalMarketValueMinor: number,
  options?: Partial<SnapshotTrendPointDto>,
): SnapshotTrendPointDto {
  let result: SnapshotTrendPointDto = {
    asOfDate,
    totalMarketValueMinor,
    totalBookValueMinor: options?.totalBookValueMinor ?? totalMarketValueMinor,
    unrealizedGainMinor:
      options?.unrealizedGainMinor ??
      totalMarketValueMinor - (options?.totalBookValueMinor ?? totalMarketValueMinor),
    gainRateOnBook: options?.gainRateOnBook ?? null,
    totalContributionsMinor: options?.totalContributionsMinor ?? null,
    gainRateOnContributions: options?.gainRateOnContributions ?? null,
    allocationsByScheme: options?.allocationsByScheme ?? {},
  };
  return result;
}

describe("mergeSnapshotTrendPoints", () => {
  it("returns empty when no series have points", () => {
    expect(mergeSnapshotTrendPoints([])).toEqual([]);
    expect(mergeSnapshotTrendPoints([[], []])).toEqual([]);
  });

  it("sums market values on shared dates", () => {
    const merged = mergeSnapshotTrendPoints([
      [point("2026-01-31", 100_000), point("2026-02-28", 110_000)],
      [point("2026-01-31", 50_000), point("2026-02-28", 60_000)],
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({
      asOfDate: "2026-01-31",
      totalMarketValueMinor: 150_000,
    });
    expect(merged[1]).toMatchObject({
      asOfDate: "2026-02-28",
      totalMarketValueMinor: 170_000,
    });
  });

  it("carries forward the last known value for missing dates", () => {
    const merged = mergeSnapshotTrendPoints([
      [point("2026-01-15", 100_000), point("2026-02-15", 120_000)],
      [point("2026-02-01", 50_000)],
    ]);

    expect(merged.map((item) => item.asOfDate)).toEqual([
      "2026-01-15",
      "2026-02-01",
      "2026-02-15",
    ]);
    expect(merged[0].totalMarketValueMinor).toBe(100_000);
    expect(merged[1].totalMarketValueMinor).toBe(150_000);
    expect(merged[2].totalMarketValueMinor).toBe(170_000);
  });

  it("sums contributions only when every active series has them", () => {
    const withContributions = mergeSnapshotTrendPoints([
      [point("2026-01-31", 100_000, { totalContributionsMinor: 80_000 })],
      [point("2026-01-31", 50_000, { totalContributionsMinor: 40_000 })],
    ]);
    expect(withContributions[0].totalContributionsMinor).toBe(120_000);
    expect(withContributions[0].gainRateOnContributions).toBeCloseTo(30_000 / 120_000);

    const partial = mergeSnapshotTrendPoints([
      [point("2026-01-31", 100_000, { totalContributionsMinor: 80_000 })],
      [point("2026-01-31", 50_000)],
    ]);
    expect(partial[0].totalContributionsMinor).toBeNull();
    expect(partial[0].gainRateOnContributions).toBeNull();
  });
});
