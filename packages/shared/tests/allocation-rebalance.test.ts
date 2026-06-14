import { describe, expect, it, vi } from "vitest";

import { computeAllocationRebalanceByInstrument } from "../src/allocation-rebalance";
import * as rebalance from "../src/rebalance";
import type { AllocationBySchemeWithLines } from "../src/snapshot-allocation";

const schemeAllocation: AllocationBySchemeWithLines = {
  schemeCode: "asset",
  schemeName: "資産",
  totalMarketValueMinor: 1_000_000,
  slices: [
    {
      valueCode: "stock",
      valueName: "株式",
      marketValueMinor: 800_000,
      weight: 0.8,
      lines: [
        {
          line: {
            id: "line-a",
            instrumentId: "inst-a",
            instrumentName: "銘柄A",
            sortOrder: null,
            quantity: 1,
            marketValueMinor: 600_000,
            bookValueMinor: null,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 0.75,
        },
        {
          line: {
            id: "line-b",
            instrumentId: "inst-b",
            instrumentName: "銘柄B",
            sortOrder: null,
            quantity: 1,
            marketValueMinor: 200_000,
            bookValueMinor: null,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 0.25,
        },
      ],
    },
    {
      valueCode: "bond",
      valueName: "債券",
      marketValueMinor: 200_000,
      weight: 0.2,
      lines: [
        {
          line: {
            id: "line-c",
            instrumentId: "inst-c",
            instrumentName: "銘柄C",
            sortOrder: null,
            quantity: 1,
            marketValueMinor: 200_000,
            bookValueMinor: null,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 1,
        },
      ],
    },
  ],
};

describe("computeAllocationRebalanceByInstrument", () => {
  it("distributes slice trades to instruments by weightInSlice", () => {
    let result = computeAllocationRebalanceByInstrument({
      schemeAllocation,
      targets: [
        { valueCode: "stock", targetRatio: 0.5 },
        { valueCode: "bond", targetRatio: 0.5 },
      ],
      portfolioTotalMinor: 1_000_000,
      depositMinor: 0,
      mode: "full",
    });

    expect(result.sliceTrades).toHaveLength(2);
    expect(result.instrumentRows).toHaveLength(3);
    expect(result.totalBuyMinor).toBe(result.totalSellMinor);

    const stockSell = result.sliceTrades.find((row) => row.key === "stock");
    expect(stockSell?.sellMinor).toBe(300_000);

    const instA = result.instrumentRows.find((row) => row.instrumentId === "inst-a");
    const instB = result.instrumentRows.find((row) => row.instrumentId === "inst-b");
    expect(instA?.sellMinor).toBe(225_000);
    expect(instB?.sellMinor).toBe(75_000);

    const instC = result.instrumentRows.find((row) => row.instrumentId === "inst-c");
    expect(instC?.buyMinor).toBe(300_000);
  });

  it("deposit_only distributes slice deposit by weightInSlice", () => {
    let result = computeAllocationRebalanceByInstrument({
      schemeAllocation,
      targets: [
        { valueCode: "stock", targetRatio: 0.5 },
        { valueCode: "bond", targetRatio: 0.5 },
      ],
      portfolioTotalMinor: 1_000_000,
      depositMinor: 200_000,
      mode: "deposit_only",
    });

    expect(result.totalSellMinor).toBe(0);
    expect(result.totalBuyMinor).toBe(200_000);
    expect(result.instrumentRows.some((row) => row.sellMinor > 0)).toBe(false);
  });

  it("uses zero instrument ratios when portfolio total is zero", () => {
    let result = computeAllocationRebalanceByInstrument({
      schemeAllocation,
      targets: [
        { valueCode: "stock", targetRatio: 0.5 },
        { valueCode: "bond", targetRatio: 0.5 },
      ],
      portfolioTotalMinor: 0,
      depositMinor: 0,
      mode: "full",
    });

    expect(result.instrumentRows.length).toBeGreaterThan(0);
    for (const row of result.instrumentRows) {
      expect(row.currentRatio).toBe(0);
      expect(row.targetMarketValueMinor).toBe(0);
    }
  });

  it("leaves target market value null when slice target ratio is missing", () => {
    const spy = vi.spyOn(rebalance, "computeRebalanceTrades").mockReturnValue({
      rows: [
        {
          key: "stock",
          currentRatio: 0.8,
          targetRatio: null,
          gapRatio: null,
          targetMarketValueMinor: null,
          buyMinor: 0,
          sellMinor: 100_000,
        },
      ],
      totalBuyMinor: 0,
      totalSellMinor: 100_000,
      unallocatedDepositMinor: 0,
    });

    let result = computeAllocationRebalanceByInstrument({
      schemeAllocation,
      targets: [],
      portfolioTotalMinor: 1_000_000,
      depositMinor: 0,
      mode: "full",
    });

    expect(result.instrumentRows[0]?.targetRatio).toBeNull();
    expect(result.instrumentRows[0]?.gapRatio).toBeNull();
    expect(result.instrumentRows[0]?.targetMarketValueMinor).toBeNull();
    expect(result.instrumentRows[0]?.sellMinor).toBeGreaterThan(0);

    spy.mockRestore();
  });

  it("defaults instrument trade to zero when proportional map lacks the key", () => {
    const computeSpy = vi.spyOn(rebalance, "computeRebalanceTrades").mockReturnValue({
      rows: [
        {
          key: "stock",
          currentRatio: 0.8,
          targetRatio: 0.5,
          gapRatio: 0.3,
          targetMarketValueMinor: 500_000,
          buyMinor: 0,
          sellMinor: 100_000,
        },
      ],
      totalBuyMinor: 0,
      totalSellMinor: 100_000,
      unallocatedDepositMinor: 0,
    });
    const distributeSpy = vi
      .spyOn(rebalance, "distributeAmountProportionally")
      .mockReturnValue(new Map());

    let result = computeAllocationRebalanceByInstrument({
      schemeAllocation,
      targets: [{ valueCode: "stock", targetRatio: 0.5 }],
      portfolioTotalMinor: 1_000_000,
      depositMinor: 0,
      mode: "full",
    });

    expect(result.instrumentRows.length).toBeGreaterThan(0);
    expect(result.instrumentRows.every((row) => row.buyMinor === 0 && row.sellMinor === 0)).toBe(
      true,
    );

    computeSpy.mockRestore();
    distributeSpy.mockRestore();
  });

  it("includes zero-holding slices in sliceTrades without instrument rows", () => {
    let result = computeAllocationRebalanceByInstrument({
      schemeAllocation,
      targets: [
        { valueCode: "stock", targetRatio: 0.5 },
        { valueCode: "bond", targetRatio: 0.5 },
        { valueCode: "cash", targetRatio: 0.1 },
      ],
      portfolioTotalMinor: 1_000_000,
      depositMinor: 0,
      mode: "full",
    });

    const cashSlice = result.sliceTrades.find((row) => row.key === "cash");
    expect(cashSlice).toBeDefined();
    expect(cashSlice?.buyMinor).toBe(100_000);
    expect(result.instrumentRows.every((row) => row.valueCode !== "cash")).toBe(true);
  });
});
