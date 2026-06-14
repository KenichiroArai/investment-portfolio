import { describe, expect, it } from "vitest";

import { computeRebalanceTrades } from "../src/rebalance";

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
});
