import { describe, expect, it } from "vitest";

import { computeTrendPeriodDeltas, computeTrendPeriodRelativeDeltas } from "../src/trend-period-deltas";

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

describe("computeTrendPeriodRelativeDeltas", () => {
  it("returns null for the first bucket and relative deltas for later buckets", () => {
    const deltas = computeTrendPeriodRelativeDeltas([0.154, 0.15, 0.129]);

    expect(deltas[0]).toBeNull();
    expect(deltas[1]).toBeCloseTo((0.15 - 0.154) / 0.154);
    expect(deltas[2]).toBeCloseTo((0.129 - 0.15) / 0.15);
  });

  it("returns null when either side is missing or previous is zero", () => {
    expect(computeTrendPeriodRelativeDeltas([null, 0.15, null])).toEqual([
      null,
      null,
      null,
    ]);
    expect(computeTrendPeriodRelativeDeltas([0, 0.15])).toEqual([null, null]);
  });

  it("returns an empty array for empty input", () => {
    expect(computeTrendPeriodRelativeDeltas([])).toEqual([]);
  });
});
