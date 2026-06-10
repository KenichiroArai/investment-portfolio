import { describe, expect, it } from "vitest";

import { buildNiceAxisScale, __chartAxisScaleTesting } from "../src/chart-axis-scale";

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

  it("builds scale for a single non-zero positive value", () => {
    const scale = buildNiceAxisScale(150_000, 150_000);

    expect(scale.min).toBe(0);
    expect(scale.max).toBeGreaterThanOrEqual(150_000);
    expect(scale.ticks[0]).toBe(0);
  });

  it("builds scale for a single negative value", () => {
    const scale = buildNiceAxisScale(-0.08, -0.08);

    expect(scale.max).toBe(0);
    expect(scale.min).toBeLessThanOrEqual(-0.08);
    expect(scale.ticks.at(-1)).toBe(0);
  });

  it("returns raw bounds for non-finite input", () => {
    const scale = buildNiceAxisScale(Number.NaN, 100);

    expect(scale).toEqual({ min: Number.NaN, max: 100, ticks: [Number.NaN] });
  });

  it("expands tick step when too many ticks would be generated", () => {
    const scale = buildNiceAxisScale(0, 9_999, { maxTicks: 4 });

    expect(scale.ticks.length).toBeLessThanOrEqual(4);
    expect(scale.max).toBeGreaterThanOrEqual(9_999);
  });

  it("handles decimal tick precision", () => {
    const scale = buildNiceAxisScale(0.01, 0.04);

    expect(scale.ticks.every((tick) => Number.isFinite(tick))).toBe(true);
    expect(scale.max).toBeGreaterThanOrEqual(0.04);
  });

  it("handles negative ranges and coarsens steps for dense ticks", () => {
    const negative = buildNiceAxisScale(-0.5, 0.5);
    expect(negative.min).toBeLessThanOrEqual(-0.5);
    expect(negative.max).toBeGreaterThanOrEqual(0.5);

    const dense = buildNiceAxisScale(0, 100_000, { maxTicks: 3 });
    expect(dense.ticks.length).toBeLessThanOrEqual(3);
  });

  it("covers internal axis scale helpers", () => {
    expect(__chartAxisScaleTesting.pickNiceStep(-1)).toBe(1);
    expect(__chartAxisScaleTesting.countTicks(0, 10, 0)).toBe(1);
    expect(__chartAxisScaleTesting.resolveTickPrecision(0)).toBe(0);
    expect(__chartAxisScaleTesting.buildTicks(Number.NaN, 1, 1)).toEqual([]);
    expect(__chartAxisScaleTesting.buildSingleValueScale(-250_000, 4).max).toBe(0);

    let step = 1;
    while (__chartAxisScaleTesting.countTicks(0, 100_000, step) > 3) {
      const nextStep = __chartAxisScaleTesting.pickNiceStep(step * 1.001);
      if (nextStep <= step) {
        step = step * 2;
      } else {
        step = nextStep;
      }
    }
    expect(step).toBeGreaterThan(1);

    const coarsened = __chartAxisScaleTesting.coarsenAxisScaleStep(
      0,
      1000,
      100,
      0,
      1000,
      10,
      () => 100,
    );
    expect(coarsened.step).toBe(200);
  });
});
