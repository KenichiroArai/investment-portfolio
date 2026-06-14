import { describe, expect, it } from "vitest";

import {
  computeRebalanceTrades,
  distributeAmountProportionally,
} from "../src/rebalance";

const rows = [
  { key: "a", marketValueMinor: 600_000, targetRatio: 0.5 },
  { key: "b", marketValueMinor: 400_000, targetRatio: 0.5 },
];

describe("computeRebalanceTrades", () => {
  it("full rebalance balances buy and sell", () => {
    let result = computeRebalanceTrades({
      rows,
      depositMinor: 0,
      mode: "full",
    });

    expect(result.rows[0]?.buyMinor).toBe(0);
    expect(result.rows[0]?.sellMinor).toBe(100_000);
    expect(result.rows[1]?.buyMinor).toBe(100_000);
    expect(result.rows[1]?.sellMinor).toBe(0);
    expect(result.totalBuyMinor).toBe(result.totalSellMinor);
    expect(result.unallocatedDepositMinor).toBe(0);
  });

  it("deposit_only buys underweight rows without selling", () => {
    let result = computeRebalanceTrades({
      rows,
      depositMinor: 200_000,
      mode: "deposit_only",
    });

    expect(result.rows[0]?.sellMinor).toBe(0);
    expect(result.rows[1]?.sellMinor).toBe(0);
    expect(result.totalSellMinor).toBe(0);
    expect(result.totalBuyMinor).toBe(200_000);
    expect(result.rows[1]?.buyMinor).toBeGreaterThan(0);
    expect(result.rows[0]?.buyMinor).toBe(0);
  });

  it("skips trade for rows without target", () => {
    let result = computeRebalanceTrades({
      rows: [
        { key: "a", marketValueMinor: 600_000, targetRatio: null },
        { key: "b", marketValueMinor: 400_000, targetRatio: 0.5 },
      ],
      depositMinor: 0,
      mode: "full",
    });

    expect(result.rows[0]?.buyMinor).toBe(0);
    expect(result.rows[0]?.sellMinor).toBe(0);
    expect(result.rows[0]?.gapRatio).toBeNull();
  });

  it("full rebalance uses deposit when computing target market values", () => {
    let result = computeRebalanceTrades({
      rows,
      depositMinor: 200_000,
      mode: "full",
    });

    expect(result.rows[0]?.buyMinor).toBe(0);
    expect(result.rows[0]?.sellMinor).toBe(0);
    expect(result.rows[1]?.buyMinor).toBe(200_000);
    expect(result.rows[1]?.sellMinor).toBe(0);
    expect(result.totalBuyMinor).toBe(200_000);
    expect(result.totalSellMinor).toBe(0);
    expect(result.unallocatedDepositMinor).toBe(0);
  });

  it("returns empty result when portfolio and deposit are both zero", () => {
    let result = computeRebalanceTrades({
      rows: [
        { key: "a", marketValueMinor: 0, targetRatio: 0.5 },
        { key: "b", marketValueMinor: 0, targetRatio: 0.5 },
      ],
      depositMinor: 0,
      mode: "full",
    });

    expect(result).toEqual({
      rows: [],
      totalBuyMinor: 0,
      totalSellMinor: 0,
      unallocatedDepositMinor: 0,
    });
  });

  it("deposit_only leaves deposit unallocated when no underweight rows", () => {
    let result = computeRebalanceTrades({
      rows: [
        { key: "a", marketValueMinor: 1_000_000, targetRatio: 0.5 },
        { key: "b", marketValueMinor: 0, targetRatio: null },
      ],
      depositMinor: 150_000,
      mode: "deposit_only",
    });

    expect(result.totalBuyMinor).toBe(0);
    expect(result.totalSellMinor).toBe(0);
    expect(result.unallocatedDepositMinor).toBe(150_000);
    expect(result.rows.every((row) => row.buyMinor === 0)).toBe(true);
  });

  it("deposit_only distributes deposit proportionally when it is less than total deficit", () => {
    let result = computeRebalanceTrades({
      rows: [
        { key: "a", marketValueMinor: 100_000, targetRatio: 0.5 },
        { key: "b", marketValueMinor: 100_000, targetRatio: 0.3 },
        { key: "c", marketValueMinor: 100_000, targetRatio: 0.2 },
      ],
      depositMinor: 50_000,
      mode: "deposit_only",
    });

    expect(result.totalSellMinor).toBe(0);
    expect(result.totalBuyMinor).toBe(50_000);
    expect(result.unallocatedDepositMinor).toBe(0);
    expect(result.rows[0]?.buyMinor).toBeGreaterThan(0);
    expect(result.rows[1]?.buyMinor).toBeGreaterThan(0);
    expect(result.rows[2]?.buyMinor).toBe(0);
  });

  it("distributes amount proportionally across weights", () => {
    let result = distributeAmountProportionally(
      [
        { key: "a", weight: 3 },
        { key: "b", weight: 1 },
      ],
      100,
    );

    expect(result.get("a")).toBe(75);
    expect(result.get("b")).toBe(25);
  });

  it("returns empty map when amount or weights are empty", () => {
    let zeroAmount = distributeAmountProportionally([{ key: "a", weight: 1 }], 0);
    let emptyWeights = distributeAmountProportionally([], 100);

    expect(zeroAmount.size).toBe(0);
    expect(emptyWeights.size).toBe(0);
  });

  it("returns empty map when total weight is zero", () => {
    let result = distributeAmountProportionally(
      [
        { key: "a", weight: 0 },
        { key: "b", weight: 0 },
      ],
      100,
    );

    expect(result.size).toBe(0);
  });

  it("uses portfolioTotalMinor as denominator when provided", () => {
    let result = computeRebalanceTrades({
      rows: [
        { key: "stock", marketValueMinor: 600_000, targetRatio: 0.5 },
        { key: "bond", marketValueMinor: 200_000, targetRatio: 0.3 },
      ],
      depositMinor: 0,
      mode: "full",
      portfolioTotalMinor: 1_000_000,
    });

    expect(result.rows[0]?.currentRatio).toBeCloseTo(0.6);
    expect(result.rows[0]?.sellMinor).toBe(100_000);
    expect(result.rows[1]?.buyMinor).toBe(100_000);
  });
});
