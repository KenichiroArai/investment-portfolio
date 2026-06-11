import { describe, expect, it } from "vitest";

import {
  OTHER_ALLOCATION_KEY,
  collapseAllocationSeries,
  computeAllocationShareChanges,
  findLargestAllocationShareChange,
  resolveDefaultTrendDisplayUnit,
} from "../src/allocation-series";

describe("allocation-series", () => {
  it("keeps all series when count is within top N", () => {
    const series = [
      { key: "a", label: "A", values: [0.5, 0.6] },
      { key: "b", label: "B", values: [0.5, 0.4] },
    ];
    const collapsed = collapseAllocationSeries(series, 6);
    expect(collapsed).toHaveLength(2);
    expect(collapsed.some((item) => item.key === OTHER_ALLOCATION_KEY)).toBe(false);
  });

  it("collapses small slices into other", () => {
    const series = [
      { key: "a", label: "A", values: [0.4, 0.45] },
      { key: "b", label: "B", values: [0.3, 0.3] },
      { key: "c", label: "C", values: [0.15, 0.1] },
      { key: "d", label: "D", values: [0.1, 0.1] },
      { key: "e", label: "E", values: [0.03, 0.03] },
      { key: "f", label: "F", values: [0.01, 0.01] },
      { key: "g", label: "G", values: [0.01, 0.01] },
    ];
    const collapsed = collapseAllocationSeries(series, 3);
    expect(collapsed).toHaveLength(4);
    const other = collapsed.find((item) => item.key === OTHER_ALLOCATION_KEY);
    expect(other).toBeDefined();
    expect(other?.values[0]).toBeCloseTo(0.15);
    expect(other?.values[1]).toBeCloseTo(0.15);
    expect(other?.otherMembers).toEqual(["D", "E", "F", "G"]);
  });

  it("computes share changes sorted by absolute delta", () => {
    const changes = computeAllocationShareChanges(
      [
        { key: "a", label: "国内株式", ratio: 0.3 },
        { key: "b", label: "外国株式", ratio: 0.2 },
      ],
      [
        { key: "a", label: "国内株式", ratio: 0.35 },
        { key: "b", label: "外国株式", ratio: 0.15 },
      ],
    );
    expect(changes).toHaveLength(2);
    expect(changes.map((item) => item.key).sort()).toEqual(["a", "b"]);
    expect(changes.find((item) => item.key === "a")?.deltaRatio).toBeCloseTo(0.05);
    expect(changes.find((item) => item.key === "b")?.deltaRatio).toBeCloseTo(-0.05);
  });

  it("finds largest share change by absolute value", () => {
    const largest = findLargestAllocationShareChange([
      {
        key: "a",
        label: "A",
        startRatio: 0.1,
        endRatio: 0.12,
        deltaRatio: 0.02,
      },
      {
        key: "b",
        label: "B",
        startRatio: 0.5,
        endRatio: 0.4,
        deltaRatio: -0.1,
      },
    ]);
    expect(largest?.key).toBe("b");
  });

  it("resolves default display unit from period preset", () => {
    expect(resolveDefaultTrendDisplayUnit("1w")).toBe("day");
    expect(resolveDefaultTrendDisplayUnit("1m")).toBe("day");
    expect(resolveDefaultTrendDisplayUnit("3m")).toBe("week");
    expect(resolveDefaultTrendDisplayUnit("6m")).toBe("week");
    expect(resolveDefaultTrendDisplayUnit("12m")).toBe("1m");
    expect(resolveDefaultTrendDisplayUnit("all")).toBe("1m");
  });

  it("resolves default display unit from range day count when preset is null", () => {
    expect(resolveDefaultTrendDisplayUnit(null, 14)).toBe("day");
    expect(resolveDefaultTrendDisplayUnit(null, 90)).toBe("week");
    expect(resolveDefaultTrendDisplayUnit(null, 400)).toBe("1m");
  });
});
