import { describe, expect, it } from "vitest";

import {
  buildPortfolioAllocationRows,
  comparePortfolioAllocationRows,
  comparePortfolioInstrumentOrder,
  computePortfolioGapDivergenceRatio,
  rollupPortfolioAllocationRowsByInstrument,
  sortHoldingLinesByPortfolioInstrumentOrder,
  sortPortfolioAllocationRows,
  type PortfolioAllocationRow,
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

  it("merges rows when the same instrument appears on multiple holding lines", () => {
    const duplicateLines: HoldingLineDto[] = [
      { ...lines[0]!, id: "line-1a", sortOrder: 1 },
      { ...lines[0]!, id: "line-1b", sortOrder: 2, marketValueMinor: 200_000 },
    ];
    let result = buildPortfolioAllocationRows(duplicateLines, [], 800_000);

    expect(result).toHaveLength(1);
    expect(result[0]?.holdingLineId).toBe("inst-a");
    expect(result[0]?.instrumentId).toBe("inst-a");
    expect(result[0]?.marketValueMinor).toBe(800_000);
    expect(result[0]?.currentRatio).toBeCloseTo(1);
    expect(result[0]?.sortOrder).toBe(1);
  });

  it("merges account-split holdings and recomputes gap from combined ratio", () => {
    const targets: TargetPortfolioWeight[] = [
      { instrumentId: "inst-a", targetRatio: 0.5 },
    ];
    const duplicateLines: HoldingLineDto[] = [
      { ...lines[0]!, id: "line-general", marketValueMinor: 600_000, sortOrder: 1 },
      { ...lines[0]!, id: "line-specific", marketValueMinor: 200_000, sortOrder: 2 },
    ];
    let result = buildPortfolioAllocationRows(duplicateLines, targets, 1_000_000);

    expect(result).toHaveLength(1);
    expect(result[0]?.marketValueMinor).toBe(800_000);
    expect(result[0]?.currentRatio).toBeCloseTo(0.8);
    expect(result[0]?.gapRatio).toBeCloseTo(0.3);
    expect(result[0]?.gapDivergenceRatio).toBeCloseTo(0.6);
    expect(result[0]?.gapMarketValueMinor).toBe(300_000);
  });
});

describe("rollupPortfolioAllocationRowsByInstrument", () => {
  it("returns a single row per instrument with summed market value", () => {
    const rows: PortfolioAllocationRow[] = [
      {
        holdingLineId: "line-1a",
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        sortOrder: 2,
        marketValueMinor: 200_000,
        currentRatio: 0.25,
        targetRatio: null,
        gapRatio: null,
        gapDivergenceRatio: null,
        gapMarketValueMinor: null,
      },
      {
        holdingLineId: "line-1b",
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        sortOrder: 1,
        marketValueMinor: 600_000,
        currentRatio: 0.75,
        targetRatio: 0.5,
        gapRatio: 0.25,
        gapDivergenceRatio: 0.5,
        gapMarketValueMinor: 200_000,
      },
    ];

    let result = rollupPortfolioAllocationRowsByInstrument(rows, 800_000);

    expect(result).toHaveLength(1);
    expect(result[0]?.holdingLineId).toBe("inst-a");
    expect(result[0]?.marketValueMinor).toBe(800_000);
    expect(result[0]?.currentRatio).toBeCloseTo(1);
    expect(result[0]?.sortOrder).toBe(1);
    expect(result[0]?.targetRatio).toBe(0.5);
    expect(result[0]?.gapRatio).toBeCloseTo(0.5);
    expect(result[0]?.gapDivergenceRatio).toBeCloseTo(1);
    expect(result[0]?.gapMarketValueMinor).toBe(400_000);
  });
});

describe("comparePortfolioInstrumentOrder", () => {
  it("sorts by sortOrder then instrument name", () => {
    const left = { sortOrder: 1, instrumentName: "銘柄B", instrumentId: "inst-b" };
    const right = { sortOrder: 2, instrumentName: "銘柄A", instrumentId: "inst-a" };
    expect(comparePortfolioInstrumentOrder(left, right)).toBeLessThan(0);
  });

  it("sorts by instrument id when sort order and name match", () => {
    const left = { sortOrder: 1, instrumentName: "銘柄A", instrumentId: "inst-a" };
    const right = { sortOrder: 1, instrumentName: "銘柄A", instrumentId: "inst-b" };
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

  it("returns null when inputs are not finite", () => {
    expect(computePortfolioGapDivergenceRatio(Number.NaN, 0.5)).toBeNull();
    expect(computePortfolioGapDivergenceRatio(0.5, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("sortHoldingLinesByPortfolioInstrumentOrder", () => {
  it("sorts holding lines by portfolio instrument order", () => {
    let result = sortHoldingLinesByPortfolioInstrumentOrder([
      { ...lines[1]! },
      { ...lines[0]! },
    ]);
    expect(result.map((line) => line.instrumentId)).toEqual(["inst-a", "inst-b"]);
  });
});

describe("comparePortfolioAllocationRows columns", () => {
  const baseRows: PortfolioAllocationRow[] = [
    {
      holdingLineId: "line-a",
      instrumentId: "inst-a",
      instrumentName: "銘柄A",
      sortOrder: 1,
      marketValueMinor: 500_000,
      currentRatio: 0.5,
      targetRatio: 0.4,
      gapRatio: 0.1,
      gapDivergenceRatio: 0.25,
      gapMarketValueMinor: 100_000,
    },
    {
      holdingLineId: "line-b",
      instrumentId: "inst-b",
      instrumentName: "銘柄B",
      sortOrder: 2,
      marketValueMinor: 500_000,
      currentRatio: 0.5,
      targetRatio: 0.6,
      gapRatio: -0.1,
      gapDivergenceRatio: 0.166,
      gapMarketValueMinor: -100_000,
    },
  ];

  it("sorts by each column and falls back to instrument order on ties", () => {
    expect(sortPortfolioAllocationRows(baseRows, "instrumentName", "asc")[0]?.instrumentId).toBe(
      "inst-a",
    );
    expect(sortPortfolioAllocationRows(baseRows, "sortOrder", "asc")[0]?.instrumentId).toBe(
      "inst-a",
    );
    expect(sortPortfolioAllocationRows(baseRows, "currentRatio", "desc")[0]?.instrumentId).toBe(
      "inst-a",
    );
    expect(sortPortfolioAllocationRows(baseRows, "targetRatio", "asc")[0]?.instrumentId).toBe(
      "inst-a",
    );
    expect(sortPortfolioAllocationRows(baseRows, "gapRatio", "desc")[0]?.instrumentId).toBe(
      "inst-a",
    );
    expect(
      sortPortfolioAllocationRows(baseRows, "gapDivergenceRatio", "desc")[0]?.instrumentId,
    ).toBe("inst-a");
    expect(sortPortfolioAllocationRows(baseRows, "marketValue", "desc")[0]?.instrumentId).toBe(
      "inst-a",
    );

    const rowsWithNullSortOrder: PortfolioAllocationRow[] = [
      { ...baseRows[0]!, sortOrder: null },
      { ...baseRows[1]!, sortOrder: 1 },
    ];
    expect(
      sortPortfolioAllocationRows(rowsWithNullSortOrder, "sortOrder", "asc")[0]?.instrumentId,
    ).toBe("inst-b");

    const rowsWithZeroSortOrder: PortfolioAllocationRow[] = [
      { ...baseRows[0]!, sortOrder: 0 },
      { ...baseRows[1]!, sortOrder: 1 },
    ];
    expect(
      sortPortfolioAllocationRows(rowsWithZeroSortOrder, "sortOrder", "asc")[0]?.instrumentId,
    ).toBe("inst-a");
  });

  it("compares sort order with defined and null values directly", () => {
    expect(
      comparePortfolioAllocationRows(
        { ...baseRows[0]!, sortOrder: 1 },
        { ...baseRows[1]!, sortOrder: null },
        "sortOrder",
        "asc",
      ),
    ).toBeLessThan(0);
    expect(
      comparePortfolioAllocationRows(
        { ...baseRows[0]!, sortOrder: null },
        { ...baseRows[1]!, sortOrder: 2 },
        "sortOrder",
        "asc",
      ),
    ).toBeGreaterThan(0);
  });
});
