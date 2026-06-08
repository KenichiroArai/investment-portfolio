import { describe, expect, it } from "vitest";

import { computeTrendPeriodDeltas } from "../src/trend-period-deltas";

describe("computeTrendPeriodDeltas", () => {
  it("returns null for the first bucket and deltas for later buckets", () => {
    const deltas = computeTrendPeriodDeltas([1_000_000, 1_100_000, 1_050_000]);

    expect(deltas).toEqual([null, 100_000, -50_000]);
  });

  it("returns null when either side of the delta is missing", () => {
    const deltas = computeTrendPeriodDeltas([null, 1_100_000, null]);

    expect(deltas).toEqual([null, null, null]);
  });

  it("returns an empty array for empty input", () => {
    const deltas = computeTrendPeriodDeltas([]);

    expect(deltas).toEqual([]);
  });
});
