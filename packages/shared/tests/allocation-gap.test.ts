import { describe, expect, it } from "vitest";

import {
  buildAllocationGapRows,
  mergeAllocationGapIntoSlices,
  normalizeTargetAllocationWeights,
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

describe("normalizeTargetAllocationWeights", () => {
  it("normalizes targets to sum to 1", () => {
    let result = normalizeTargetAllocationWeights([
      { valueCode: "domestic", targetRatio: 0.4 },
      { valueCode: "foreign", targetRatio: 0.59 },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]?.targetRatio).toBeCloseTo(0.4 / 0.99, 5);
    expect(result[1]?.targetRatio).toBeCloseTo(0.59 / 0.99, 5);
    const sum = result.reduce((acc, row) => acc + row.targetRatio, 0);
    expect(sum).toBeCloseTo(1);
  });

  it("returns empty array when total is zero", () => {
    let result = normalizeTargetAllocationWeights([]);
    expect(result).toEqual([]);
  });
});

describe("buildAllocationGapRows", () => {
  it("computes gap using normalized targets", () => {
    let result = buildAllocationGapRows(slices, [
      { valueCode: "domestic", targetRatio: 0.5 },
      { valueCode: "foreign", targetRatio: 0.5 },
    ]);

    expect(result[0]?.targetRatio).toBeCloseTo(0.5);
    expect(result[0]?.gapRatio).toBeCloseTo(0.1);
    expect(result[0]?.gapMarketValueMinor).toBe(100_000);
    expect(result[1]?.targetRatio).toBeCloseTo(0.5);
    expect(result[1]?.gapRatio).toBeCloseTo(-0.1);
  });

  it("returns empty for no slices", () => {
    let result = buildAllocationGapRows([], []);
    expect(result).toEqual([]);
  });

  it("uses slice weight when classified total is zero", () => {
    const zeroSlices: AllocationSlice[] = [
      {
        valueCode: "domestic",
        valueName: "国内株式",
        marketValueMinor: 0,
        weight: 0,
      },
    ];

    let result = buildAllocationGapRows(
      zeroSlices,
      [{ valueCode: "domestic", targetRatio: 0.5 }],
    );

    expect(result[0]?.currentRatio).toBe(0);
    expect(result[0]?.targetRatio).toBeCloseTo(1);
    expect(result[0]?.gapRatio).toBeCloseTo(-1);
    expect(result[0]?.gapMarketValueMinor).toBeNull();
  });

  it("normalizes partial target totals before comparing to classified weights", () => {
    const classifiedSlices: AllocationSlice[] = [
      {
        valueCode: "global_equity",
        valueName: "内外株式",
        marketValueMinor: 698_025,
        weight: 698_025 / 1_734_297,
      },
    ];

    let result = buildAllocationGapRows(classifiedSlices, [
      { valueCode: "global_equity", targetRatio: 0.4 },
      { valueCode: "foreign_equity", targetRatio: 0.3 },
      { valueCode: "foreign_bond", targetRatio: 0.1 },
      { valueCode: "domestic_equity", targetRatio: 0.08 },
      { valueCode: "domestic_bond", targetRatio: 0.05 },
      { valueCode: "foreign_reit", targetRatio: 0.03 },
      { valueCode: "domestic_reit", targetRatio: 0.03 },
    ]);

    const normalizedTarget = 0.4 / 0.99;
    expect(result[0]?.targetRatio).toBeCloseTo(normalizedTarget, 4);
    expect(result[0]?.gapRatio).toBeCloseTo(698_025 / 1_734_297 - normalizedTarget, 4);
    expect(Math.abs(result[0]?.gapRatio ?? 0)).toBeLessThan(0.01);
  });
});

describe("mergeAllocationGapIntoSlices", () => {
  it("merges gap fields into slices", () => {
    const targets: TargetAllocationWeight[] = [
      { valueCode: "domestic", targetRatio: 0.5 },
      { valueCode: "foreign", targetRatio: 0.5 },
    ];
    const gapRows = buildAllocationGapRows(slices, targets);
    let result = mergeAllocationGapIntoSlices(slices, gapRows);

    expect(result[0]?.targetRatio).toBeCloseTo(0.5);
    expect(result[0]?.gapRatio).toBeCloseTo(0.1);
  });
});
