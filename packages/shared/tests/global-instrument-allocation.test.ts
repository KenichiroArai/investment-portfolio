import { describe, expect, it } from "vitest";

import {
  buildGlobalInstrumentPortfolioStack,
  buildGlobalInstrumentRows,
  buildGlobalPortfolioSlices,
  collapseGlobalInstrumentRows,
  GLOBAL_INSTRUMENT_EMPTY_NAME_LABEL,
  GLOBAL_INSTRUMENT_OTHER_VALUE_CODE,
  toInstrumentAllocationSlices,
  toPortfolioAllocationSlices,
} from "../src/global-instrument-allocation";
import type { CurrentSnapshotDto, HoldingLineDto } from "../src/types";

function makeLine(
  overrides: Partial<HoldingLineDto> &
    Pick<HoldingLineDto, "id" | "instrumentName" | "marketValueMinor">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    instrumentId: overrides.instrumentId ?? overrides.id,
    accountId: overrides.accountId ?? "acct-1",
    accountName: overrides.accountName ?? "口座1",
    sortOrder: overrides.sortOrder ?? null,
    quantity: overrides.quantity ?? 1,
    bookValueMinor:
      overrides.bookValueMinor === undefined ? 0 : overrides.bookValueMinor,
    metrics: overrides.metrics ?? [],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags: overrides.tags ?? [],
    id: overrides.id,
    instrumentName: overrides.instrumentName,
    marketValueMinor: overrides.marketValueMinor,
  };
  return result;
}

function makeSnapshot(
  overrides: Partial<CurrentSnapshotDto> &
    Pick<CurrentSnapshotDto, "portfolioCode" | "portfolioName" | "lines">,
): CurrentSnapshotDto {
  let result: CurrentSnapshotDto = {
    id: overrides.id ?? `snap-${overrides.portfolioCode}`,
    asOfDate: overrides.asOfDate ?? "2026-01-01",
    analysisSchemes: overrides.analysisSchemes ?? [],
    metrics: overrides.metrics ?? [],
    portfolioCode: overrides.portfolioCode,
    portfolioName: overrides.portfolioName,
    lines: overrides.lines,
  };
  return result;
}

describe("buildGlobalInstrumentRows", () => {
  it("aggregates same instrument name across portfolios", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "ideco",
        portfolioName: "iDeCo",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "  先進国株式  ",
            marketValueMinor: 300_000,
            bookValueMinor: 250_000,
          }),
        ],
      }),
      makeSnapshot({
        portfolioCode: "monex",
        portfolioName: "マネックス",
        lines: [
          makeLine({
            id: "l2",
            instrumentName: "先進国株式",
            marketValueMinor: 200_000,
            bookValueMinor: 180_000,
          }),
          makeLine({
            id: "l3",
            instrumentName: "国内債券",
            marketValueMinor: 100_000,
            bookValueMinor: 100_000,
          }),
        ],
      }),
    ];

    let result = buildGlobalInstrumentRows(snapshots);

    expect(result).toHaveLength(2);
    expect(result[0]?.instrumentKey).toBe("先進国株式");
    expect(result[0]?.marketValueMinor).toBe(500_000);
    expect(result[0]?.weight).toBeCloseTo(500_000 / 600_000);
    expect(result[0]?.bookValueMinor).toBe(430_000);
    expect(result[0]?.unrealizedGainMinor).toBe(70_000);
    expect(result[0]?.portfolios).toHaveLength(2);
    expect(result[0]?.portfolios[0]?.portfolioCode).toBe("ideco");
    expect(result[0]?.portfolios[0]?.weightInInstrument).toBeCloseTo(0.6);
    expect(result[1]?.instrumentName).toBe("国内債券");
  });

  it("keeps differently named instruments separate", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "a",
        portfolioName: "A",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "銘柄A",
            marketValueMinor: 100,
            bookValueMinor: 100,
          }),
          makeLine({
            id: "l2",
            instrumentName: "銘柄B",
            marketValueMinor: 50,
            bookValueMinor: 50,
          }),
        ],
      }),
    ];

    let result = buildGlobalInstrumentRows(snapshots);
    expect(result.map((row) => row.instrumentKey)).toEqual(["銘柄A", "銘柄B"]);
  });

  it("uses empty-name label for blank instrument names", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "a",
        portfolioName: "A",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "   ",
            marketValueMinor: 10,
            bookValueMinor: 10,
          }),
        ],
      }),
    ];

    let result = buildGlobalInstrumentRows(snapshots);
    expect(result[0]?.instrumentKey).toBe("");
    expect(result[0]?.instrumentName).toBe(GLOBAL_INSTRUMENT_EMPTY_NAME_LABEL);
  });

  it("nulls unrealized gain when any book value is missing", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "a",
        portfolioName: "A",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "銘柄",
            marketValueMinor: 100,
            bookValueMinor: 80,
          }),
          makeLine({
            id: "l2",
            instrumentName: "銘柄",
            marketValueMinor: 50,
            bookValueMinor: null,
          }),
        ],
      }),
    ];

    let result = buildGlobalInstrumentRows(snapshots);
    expect(result[0]?.marketValueMinor).toBe(150);
    expect(result[0]?.bookValueMinor).toBeNull();
    expect(result[0]?.unrealizedGainMinor).toBeNull();
    expect(result[0]?.unrealizedGainRate).toBeNull();
  });

  it("returns empty for no snapshots", () => {
    let result = buildGlobalInstrumentRows([]);
    expect(result).toEqual([]);
  });
});

describe("collapseGlobalInstrumentRows", () => {
  it("collapses overflow rows into other", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "a",
        portfolioName: "A",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "A",
            marketValueMinor: 400,
            bookValueMinor: 400,
          }),
          makeLine({
            id: "l2",
            instrumentName: "B",
            marketValueMinor: 300,
            bookValueMinor: 300,
          }),
          makeLine({
            id: "l3",
            instrumentName: "C",
            marketValueMinor: 200,
            bookValueMinor: 200,
          }),
          makeLine({
            id: "l4",
            instrumentName: "D",
            marketValueMinor: 100,
            bookValueMinor: 100,
          }),
        ],
      }),
    ];
    const rows = buildGlobalInstrumentRows(snapshots);
    let result = collapseGlobalInstrumentRows(rows, 2);

    expect(result).toHaveLength(3);
    expect(result[2]?.instrumentKey).toBe(GLOBAL_INSTRUMENT_OTHER_VALUE_CODE);
    expect(result[2]?.marketValueMinor).toBe(300);
    expect(result[2]?.weight).toBeCloseTo(0.3);
  });
});

describe("buildGlobalPortfolioSlices", () => {
  it("builds portfolio weights", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "a",
        portfolioName: "A",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "X",
            marketValueMinor: 750,
            bookValueMinor: 750,
          }),
        ],
      }),
      makeSnapshot({
        portfolioCode: "b",
        portfolioName: "B",
        lines: [
          makeLine({
            id: "l2",
            instrumentName: "Y",
            marketValueMinor: 250,
            bookValueMinor: 250,
          }),
        ],
      }),
    ];

    let result = buildGlobalPortfolioSlices(snapshots);
    expect(result.totalMarketValueMinor).toBe(1_000);
    expect(result.portfolios[0]?.weight).toBeCloseTo(0.75);
    expect(toPortfolioAllocationSlices(result.portfolios)[0]?.valueCode).toBe(
      "a",
    );
  });
});

describe("toInstrumentAllocationSlices and stack", () => {
  it("maps rows to chart slices and stacked series", () => {
    const snapshots = [
      makeSnapshot({
        portfolioCode: "a",
        portfolioName: "A",
        lines: [
          makeLine({
            id: "l1",
            instrumentName: "共通",
            marketValueMinor: 100,
            bookValueMinor: 100,
          }),
        ],
      }),
      makeSnapshot({
        portfolioCode: "b",
        portfolioName: "B",
        lines: [
          makeLine({
            id: "l2",
            instrumentName: "共通",
            marketValueMinor: 50,
            bookValueMinor: 50,
          }),
          makeLine({
            id: "l3",
            instrumentName: "単独",
            marketValueMinor: 20,
            bookValueMinor: 20,
          }),
        ],
      }),
    ];
    const rows = buildGlobalInstrumentRows(snapshots);
    const { portfolios } = buildGlobalPortfolioSlices(snapshots);
    const slices = toInstrumentAllocationSlices(rows);
    const stack = buildGlobalInstrumentPortfolioStack(rows, portfolios, 10);

    expect(slices[0]?.valueName).toBe("共通");
    expect(slices[0]?.marketValueMinor).toBe(150);
    expect(stack.labels).toEqual(["共通", "単独"]);
    expect(stack.series).toHaveLength(2);
    expect(stack.series[0]?.values).toEqual([100, 0]);
    expect(stack.series[1]?.values).toEqual([50, 20]);
  });
});
