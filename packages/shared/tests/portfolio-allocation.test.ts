import { describe, expect, it } from "vitest";

import {
  buildPortfolioAllocationRows,
  comparePortfolioInstrumentOrder,
  computePortfolioGapDivergenceRatio,
  sortPortfolioAllocationRows,
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
    expect(result[0]?.gapDivergenceRatio).toBeCloseTo(0.2);
    expect(result[0]?.gapMarketValueMinor).toBe(100_000);
    expect(result[1]?.targetRatio).toBeNull();
    expect(result[1]?.gapRatio).toBeNull();
    expect(result[1]?.gapDivergenceRatio).toBeNull();
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
    expect(result[0]?.gapDivergenceRatio).toBeCloseTo(1);
    expect(result[0]?.gapMarketValueMinor).toBeNull();
  });

  it("returns rows in portfolio instrument order", () => {
    const unorderedLines: HoldingLineDto[] = [
      { ...lines[1]!, sortOrder: 2 },
      { ...lines[0]!, sortOrder: 1 },
    ];
    let result = buildPortfolioAllocationRows(unorderedLines, [], 1_000_000);

    expect(result.map((row) => row.instrumentId)).toEqual(["inst-a", "inst-b"]);
  });
});

describe("comparePortfolioInstrumentOrder", () => {
  it("sorts by sortOrder then instrument name", () => {
    const left = { sortOrder: 1, instrumentName: "銘柄B", instrumentId: "inst-b" };
    const right = { sortOrder: 2, instrumentName: "銘柄A", instrumentId: "inst-a" };
    expect(comparePortfolioInstrumentOrder(left, right)).toBeLessThan(0);
  });
});

describe("sortPortfolioAllocationRows", () => {
  it("uses portfolio instrument order as tie-breaker", () => {
    const rows = buildPortfolioAllocationRows(lines, [], 1_000_000);
    let result = sortPortfolioAllocationRows(rows, "marketValue", "desc");

    expect(result.map((row) => row.instrumentId)).toEqual(["inst-a", "inst-b"]);
  });
});

describe("computePortfolioGapDivergenceRatio", () => {
  it("returns absolute gap relative to target", () => {
    expect(computePortfolioGapDivergenceRatio(0.45, 0.3)).toBeCloseTo(0.5);
    expect(computePortfolioGapDivergenceRatio(0.15, 0.3)).toBeCloseTo(0.5);
  });

  it("returns uncapped values above 100%", () => {
    expect(computePortfolioGapDivergenceRatio(0.3, 0.1)).toBeCloseTo(2);
  });

  it("returns zero when current matches zero target", () => {
    expect(computePortfolioGapDivergenceRatio(0, 0)).toBe(0);
  });

  it("returns null when current is positive but target is zero", () => {
    expect(computePortfolioGapDivergenceRatio(0.1, 0)).toBeNull();
  });
});
