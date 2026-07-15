import { describe, expect, it } from "vitest";

import {
  buildMonexHoldingMetrics,
  computeMonexMutualFundBookValueMinor,
} from "../src/monex-holding-metrics";

describe("monex-holding-metrics", () => {
  it("computes mutual fund book value from avg cost per 10000 lots", () => {
    expect(computeMonexMutualFundBookValueMinor(29147, 3431)).toBe(10000);
    expect(computeMonexMutualFundBookValueMinor(9500, 100)).toBe(95);
  });

  it("returns zero for non-finite mutual fund book value inputs", () => {
    expect(computeMonexMutualFundBookValueMinor(Number.NaN, 100)).toBe(0);
    expect(computeMonexMutualFundBookValueMinor(9500, Number.NaN)).toBe(0);
  });

  it("builds monex holding metrics", () => {
    const metrics = buildMonexHoldingMetrics({
      unitPriceMinor: 10000,
      avgCostMinor: 9500,
      accountType: "一般",
      custodyType: "普通預り",
      dividendOption: "再投資",
      unrealizedGainMinor: 50,
      unrealizedGainRate: 0.05,
    });
    expect(metrics.some((metric) => metric.code === "unit_price_minor")).toBe(true);
    expect(metrics.some((metric) => metric.code === "account_type")).toBe(true);
  });
});
