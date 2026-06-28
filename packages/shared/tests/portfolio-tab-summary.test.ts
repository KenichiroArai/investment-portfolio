import { describe, expect, it } from "vitest";

import { buildPortfolioAllocationRows } from "../src/portfolio-allocation";
import {
  findLargestAllocationDivergence,
  findLargestAllocationGap,
  pickTopAllocationHoldings,
  sumTargetPortfolioRatio,
} from "../src/portfolio-tab-summary";
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
    marketValueMinor: 300_000,
    bookValueMinor: 250_000,
    metrics: [],
    instrumentAttributes: [],
    tags: [],
  },
  {
    id: "line-3",
    instrumentId: "inst-c",
    instrumentName: "銘柄C",
    sortOrder: 3,
    quantity: 20,
    marketValueMinor: 100_000,
    bookValueMinor: 90_000,
    metrics: [],
    instrumentAttributes: [],
    tags: [],
  },
];

describe("pickTopAllocationHoldings", () => {
  it("returns holdings sorted by current ratio descending", () => {
    const rows = buildPortfolioAllocationRows(lines, [], 1_000_000);
    let result = pickTopAllocationHoldings(rows, 2);

    expect(result).toEqual([
      {
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        currentRatio: 0.6,
      },
      {
        instrumentId: "inst-b",
        instrumentName: "銘柄B",
        currentRatio: 0.3,
      },
    ]);
  });

  it("returns empty array when limit is zero", () => {
    const rows = buildPortfolioAllocationRows(lines, [], 1_000_000);
    let result = pickTopAllocationHoldings(rows, 0);
    expect(result).toEqual([]);
  });
});

describe("findLargestAllocationGap", () => {
  it("returns the row with the largest absolute gap", () => {
    const rows = buildPortfolioAllocationRows(
      lines,
      [
        { instrumentId: "inst-a", targetRatio: 0.4 },
        { instrumentId: "inst-b", targetRatio: 0.35 },
        { instrumentId: "inst-c", targetRatio: 0.25 },
      ],
      1_000_000,
    );
    let result = findLargestAllocationGap(rows);

    expect(result?.instrumentId).toBe("inst-a");
    expect(result?.instrumentName).toBe("銘柄A");
    expect(result?.gapRatio).toBeCloseTo(0.2);
  });

  it("returns null when no targets are set", () => {
    const rows = buildPortfolioAllocationRows(lines, [], 1_000_000);
    let result = findLargestAllocationGap(rows);
    expect(result).toBeNull();
  });
});

describe("findLargestAllocationDivergence", () => {
  it("returns the row with the largest divergence ratio", () => {
    const rows = buildPortfolioAllocationRows(
      lines,
      [
        { instrumentId: "inst-a", targetRatio: 0.5 },
        { instrumentId: "inst-b", targetRatio: 0.05 },
        { instrumentId: "inst-c", targetRatio: 0.25 },
      ],
      1_000_000,
    );
    let result = findLargestAllocationDivergence(rows);

    expect(result?.instrumentId).toBe("inst-b");
    expect(result?.gapDivergenceRatio).toBeCloseTo(5);
    expect(result?.gapRatio).toBeCloseTo(0.25);
  });

  it("returns null when no targets are set", () => {
    const rows = buildPortfolioAllocationRows(lines, [], 1_000_000);
    let result = findLargestAllocationDivergence(rows);
    expect(result).toBeNull();
  });
});

describe("sumTargetPortfolioRatio", () => {
  it("sums finite target ratios", () => {
    let result = sumTargetPortfolioRatio([
      { instrumentId: "inst-a", targetRatio: 0.4 },
      { instrumentId: "inst-b", targetRatio: 0.35 },
    ]);
    expect(result).toBeCloseTo(0.75);
  });

  it("returns zero for empty weights", () => {
    let result = sumTargetPortfolioRatio([]);
    expect(result).toBe(0);
  });

  it("ignores non-finite target ratios", () => {
    let result = sumTargetPortfolioRatio([
      { instrumentId: "inst-a", targetRatio: 0.4 },
      { instrumentId: "inst-b", targetRatio: Number.NaN },
      { instrumentId: "inst-c", targetRatio: Number.POSITIVE_INFINITY },
    ]);
    expect(result).toBeCloseTo(0.4);
  });
});

describe("findLargestAllocationDivergence edge cases", () => {
  it("skips rows with null gap ratio even when divergence is set", () => {
    const rows = buildPortfolioAllocationRows(lines, [], 1_000_000);
    rows[0] = {
      ...rows[0]!,
      targetRatio: 0.5,
      gapRatio: null,
      gapDivergenceRatio: 0.9,
    };
    rows[1] = {
      ...rows[1]!,
      targetRatio: 0.3,
      gapRatio: 0.1,
      gapDivergenceRatio: 0.2,
    };

    let result = findLargestAllocationDivergence(rows);
    expect(result?.instrumentId).toBe("inst-b");
  });
});
