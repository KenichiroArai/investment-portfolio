import { describe, expect, it } from "vitest";

import {
  buildPortfolioAllocationRows,
  type TargetPortfolioWeight,
} from "../src/portfolio-allocation";
import type { HoldingLineDto } from "../src/types";

const lines: HoldingLineDto[] = [
  {
    id: "line-1",
    instrumentId: "inst-a",
    instrumentName: "銘柄A",
    sortOrder: 1,
    quantity: 100,
    marketValueMinor: 600_000,
    bookValueMinor: 500_000,
    metrics: [],
    instrumentAttributes: [],
    tags: [],
  },
  {
    id: "line-2",
    instrumentId: "inst-b",
    instrumentName: "銘柄B",
    sortOrder: 2,
    quantity: 50,
    marketValueMinor: 400_000,
    bookValueMinor: 350_000,
    metrics: [],
    instrumentAttributes: [],
    tags: [],
  },
];

describe("buildPortfolioAllocationRows", () => {
  it("computes gap when target is set", () => {
    const targets: TargetPortfolioWeight[] = [
      { instrumentId: "inst-a", targetRatio: 0.5 },
    ];
    let result = buildPortfolioAllocationRows(lines, targets, 1_000_000);

    expect(result[0]?.currentRatio).toBeCloseTo(0.6);
    expect(result[0]?.gapRatio).toBeCloseTo(0.1);
    expect(result[0]?.gapMarketValueMinor).toBe(100_000);
    expect(result[1]?.targetRatio).toBeNull();
    expect(result[1]?.gapRatio).toBeNull();
  });

  it("returns empty for no lines", () => {
    let result = buildPortfolioAllocationRows([], [], 0);
    expect(result).toEqual([]);
  });

  it("uses zero current ratio and null gap market value when asset total is zero", () => {
    const targets: TargetPortfolioWeight[] = [
      { instrumentId: "inst-a", targetRatio: 0.5 },
    ];
    let result = buildPortfolioAllocationRows(lines, targets, 0);

    expect(result[0]?.currentRatio).toBe(0);
    expect(result[0]?.gapRatio).toBeCloseTo(-0.5);
    expect(result[0]?.gapMarketValueMinor).toBeNull();
  });
});
