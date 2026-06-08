import { describe, expect, it } from "vitest";

import {
  resolveTrendChartValueRange,
  resolveTrendSeriesValueDomain,
} from "../src/trend-chart-domain";

describe("resolveTrendChartValueRange", () => {
  it("includes zero for delta-style ranges", () => {
    const domain = resolveTrendChartValueRange([null, 0.02, -0.01], "includeZero");

    expect(domain).toEqual({ min: -0.01, max: 0.02 });
  });

  it("fits data range with padding for composition ratios", () => {
    const domain = resolveTrendChartValueRange([0.12, 0.18, 0.15], "fitData");

    expect(domain.min).toBeGreaterThanOrEqual(0);
    expect(domain.max).toBeLessThan(1);
    expect(domain.min).toBeLessThan(0.12);
    expect(domain.max).toBeGreaterThan(0.18);
  });
});

describe("resolveTrendSeriesValueDomain", () => {
  it("aggregates values across multiple series", () => {
    const domain = resolveTrendSeriesValueDomain(
      [
        { values: [0.1, 0.2] },
        { values: [0.05, 0.15] },
      ],
      "fitData",
    );

    expect(domain.min).toBeGreaterThanOrEqual(0);
    expect(domain.max).toBeGreaterThan(0.2);
  });
});
