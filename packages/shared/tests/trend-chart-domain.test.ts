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

  it("returns default domain when all values are null", () => {
    expect(resolveTrendChartValueRange([null, null], "fitData")).toEqual({
      min: 0,
      max: 1,
    });
  });

  it("includes zero for negative-only delta ranges", () => {
    const domain = resolveTrendChartValueRange([-0.2, -0.05], "includeZero");
    expect(domain.min).toBe(-0.2);
    expect(domain.max).toBe(0);
  });

  it("allows negative padding for mixed-sign fitData ranges", () => {
    const domain = resolveTrendChartValueRange([-0.2, 0.3], "fitData");
    expect(domain.min).toBeLessThan(-0.2);
    expect(domain.max).toBeGreaterThan(0.3);
  });

  it("uses minimum padding when fitData range is zero", () => {
    const domain = resolveTrendChartValueRange([0.15, 0.15, 0.15], "fitData");
    expect(domain.max).toBeGreaterThan(0.15);
    expect(domain.min).toBeGreaterThanOrEqual(0);
  });

  it("extends positive-only includeZero ranges to zero", () => {
    const domain = resolveTrendChartValueRange([0.05, 0.1, 0.08], "includeZero");
    expect(domain.min).toBe(0);
    expect(domain.max).toBe(0.1);
  });

  it("clamps fitData minimum to zero for non-negative series with small values", () => {
    const domain = resolveTrendChartValueRange([0.001, 0.002], "fitData");
    expect(domain.min).toBeGreaterThanOrEqual(0);
    expect(domain.max).toBeGreaterThan(0.002);

    const clamped = resolveTrendChartValueRange([0, 0.001], "fitData");
    expect(clamped.min).toBe(0);
  });
});
