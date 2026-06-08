import { describe, expect, it } from "vitest";

import { buildNiceAxisScale } from "../src/chart-axis-scale";

describe("buildNiceAxisScale", () => {
  it("uses 50万円 steps for mid-range yen values", () => {
    const scale = buildNiceAxisScale(0, 2_200_000);

    expect(scale.min).toBe(0);
    expect(scale.max).toBe(2_500_000);
    expect(scale.ticks).toEqual([0, 500_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000]);
  });

  it("uses 100万円 steps for large yen values", () => {
    const scale = buildNiceAxisScale(0, 3_441_347);

    expect(scale.min).toBe(0);
    expect(scale.max).toBe(4_000_000);
    expect(scale.ticks).toEqual([0, 1_000_000, 2_000_000, 3_000_000, 4_000_000]);
  });

  it("uses 25% steps for ratio charts from 0 to 1", () => {
    const scale = buildNiceAxisScale(0, 1);

    expect(scale.min).toBe(0);
    expect(scale.max).toBe(1);
    expect(scale.ticks).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("rounds gain-rate ranges to readable percent ticks", () => {
    const scale = buildNiceAxisScale(0, 0.154);

    expect(scale.min).toBe(0);
    expect(scale.max).toBe(0.2);
    expect(scale.ticks).toEqual([0, 0.05, 0.1, 0.15, 0.2]);
  });

  it("handles a single positive value", () => {
    const scale = buildNiceAxisScale(0, 0);

    expect(scale.min).toBe(0);
    expect(scale.max).toBe(1);
    expect(scale.ticks).toEqual([0, 1]);
  });
});
