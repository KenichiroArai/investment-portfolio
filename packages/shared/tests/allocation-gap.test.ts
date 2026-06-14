import { describe, expect, it } from "vitest";

import {
  buildAllocationGapRows,
  mergeAllocationGapIntoSlices,
  type TargetAllocationWeight,
} from "../src/allocation-gap";
import type { AllocationSlice } from "../src/snapshot-allocation";

const slices: AllocationSlice[] = [
  {
    valueCode: "domestic",
    valueName: "国内株式",
    marketValueMinor: 600_000,
    weight: 0.6,
  },
  {
    valueCode: "foreign",
    valueName: "外国株式",
    marketValueMinor: 400_000,
    weight: 0.4,
  },
];

describe("buildAllocationGapRows", () => {
  it("computes gap when target is set", () => {
    let result = buildAllocationGapRows(
      slices,
      [{ valueCode: "domestic", targetRatio: 0.5 }],
      1_000_000,
    );

    expect(result[0]?.gapRatio).toBeCloseTo(0.1);
    expect(result[0]?.gapMarketValueMinor).toBe(100_000);
    expect(result[1]?.targetRatio).toBeNull();
    expect(result[1]?.gapRatio).toBeNull();
  });

  it("returns empty for no slices", () => {
    let result = buildAllocationGapRows([], [], 0);
    expect(result).toEqual([]);
  });

  it("uses zero current ratio when asset total is zero", () => {
    let result = buildAllocationGapRows(
      slices,
      [{ valueCode: "domestic", targetRatio: 0.5 }],
      0,
    );

    expect(result[0]?.currentRatio).toBe(0);
    expect(result[0]?.gapRatio).toBe(-0.5);
    expect(result[0]?.gapMarketValueMinor).toBeNull();
  });
});

describe("mergeAllocationGapIntoSlices", () => {
  it("merges gap fields into slices", () => {
    const targets: TargetAllocationWeight[] = [
      { valueCode: "domestic", targetRatio: 0.5 },
    ];
    const gapRows = buildAllocationGapRows(slices, targets, 1_000_000);
    let result = mergeAllocationGapIntoSlices(slices, gapRows);

    expect(result[0]?.targetRatio).toBe(0.5);
    expect(result[0]?.gapRatio).toBeCloseTo(0.1);
  });
});
