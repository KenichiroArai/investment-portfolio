import { describe, expect, it } from "vitest";

import {
  buildRakutenHoldingMetrics,
  computeRakutenEquityBookValueMinor,
  computeRakutenMutualFundBookValueMinor,
} from "../src/rakuten-holding-metrics";

describe("rakuten-holding-metrics", () => {
  it("computes mutual fund book value from avg cost per 10000 lots", () => {
    expect(computeRakutenMutualFundBookValueMinor(9202, 1629)).toBe(1499);
  });

  it("returns zero for non-finite mutual fund book value inputs", () => {
    expect(computeRakutenMutualFundBookValueMinor(Number.NaN, 100)).toBe(0);
    expect(computeRakutenMutualFundBookValueMinor(9202, Number.NaN)).toBe(0);
  });

  it("computes equity book value from avg cost and shares", () => {
    expect(computeRakutenEquityBookValueMinor(3285, 1)).toBe(3285);
    expect(computeRakutenEquityBookValueMinor(506.5, 2)).toBe(1013);
  });

  it("returns zero for non-finite equity book value inputs", () => {
    expect(computeRakutenEquityBookValueMinor(Number.NaN, 2)).toBe(0);
    expect(computeRakutenEquityBookValueMinor(100, Number.NaN)).toBe(0);
  });

  it("builds rakuten holding metrics", () => {
    const metrics = buildRakutenHoldingMetrics({
      unitPriceMinor: 3329,
      avgCostMinor: 3285,
      accountType: "特定",
      unrealizedGainMinor: 44,
      unrealizedGainRate: 0.0133,
    });
    expect(metrics.some((metric) => metric.code === "unit_price_minor")).toBe(true);
    expect(metrics.some((metric) => metric.code === "account_type")).toBe(true);
    expect(metrics.some((metric) => metric.code === "unrealized_gain_minor")).toBe(true);
  });
});
