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

  it("keeps the current largest when a later change is smaller", () => {
    const largest = findLargestAllocationShareChange([
      {
        key: "b",
        label: "B",
        startRatio: 0.5,
        endRatio: 0.4,
        deltaRatio: -0.1,
      },
      {
        key: "a",
        label: "A",
        startRatio: 0.1,
        endRatio: 0.12,
        deltaRatio: 0.02,
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
    expect(resolveDefaultTrendDisplayUnit("all", 11)).toBe("day");
    expect(resolveDefaultTrendDisplayUnit("all", 60)).toBe("week");
    expect(resolveDefaultTrendDisplayUnit("12m", 20)).toBe("day");
    expect(resolveDefaultTrendDisplayUnit("12m", 60)).toBe("week");
    expect(resolveDefaultTrendDisplayUnit("12m", 400)).toBe("1m");
  });

  it("resolves default display unit from range day count when preset is null", () => {
    expect(resolveDefaultTrendDisplayUnit(null, 14)).toBe("day");
    expect(resolveDefaultTrendDisplayUnit(null, 90)).toBe("week");
    expect(resolveDefaultTrendDisplayUnit(null, 400)).toBe("1m");
    expect(resolveDefaultTrendDisplayUnit(null)).toBe("day");
  });

  it("returns empty collapsed series for empty input", () => {
    expect(collapseAllocationSeries([])).toEqual([]);
  });

  it("skips share changes when both ratios are non-finite", () => {
    const changes = computeAllocationShareChanges(
      [{ key: "a", label: "A", ratio: Number.NaN }],
      [{ key: "a", label: "A", ratio: Number.POSITIVE_INFINITY }],
    );
    expect(changes).toEqual([]);
  });

  it("returns null when no share changes exist", () => {
    expect(findLargestAllocationShareChange([])).toBeNull();
  });

  it("skips share changes when both ratios are null", () => {
    const changes = computeAllocationShareChanges(
      [{ key: "a", label: "A", ratio: null }],
      [{ key: "a", label: "A", ratio: null }],
    );
    expect(changes).toEqual([]);
  });

  it("treats all-null series averages as zero when collapsing", () => {
    const series = [
      { key: "top", label: "Top", values: [0.5, 0.5] },
      { key: "a", label: "A", values: [0.2, 0.2] },
      { key: "b", label: "B", values: [0.15, 0.15] },
      { key: "c", label: "C", values: [0.1, 0.1] },
      { key: "nullish", label: "Nullish", values: [null, null] },
      { key: "d", label: "D", values: [0.03, 0.03] },
      { key: "e", label: "E", values: [0.01, 0.01] },
      { key: "f", label: "F", values: [0.01, 0.01] },
    ];
    const collapsed = collapseAllocationSeries(series, 3);
    expect(collapsed.find((item) => item.key === OTHER_ALLOCATION_KEY)).toBeDefined();
  });

  it("handles collapsed series with empty value buckets", () => {
    const series = [
      {
        key: "empty",
        label: "Empty",
        values: undefined as unknown as Array<number | null>,
      },
      { key: "empty2", label: "Empty2", values: [] as Array<number | null> },
      { key: "a", label: "A", values: [0.4] },
      { key: "b", label: "B", values: [0.3] },
      { key: "c", label: "C", values: [0.15] },
      { key: "d", label: "D", values: [0.05] },
      { key: "e", label: "E", values: [0.04] },
      { key: "f", label: "F", values: [0.03] },
      { key: "g", label: "G", values: [0.02] },
      { key: "h", label: "H", values: [0.01] },
    ];
    expect(collapseAllocationSeries(series, 3)).toHaveLength(4);
  });

  it("falls back to key when label is missing", () => {
    const changes = computeAllocationShareChanges(
      [{ key: "a", label: undefined as unknown as string, ratio: 0.1 }],
      [{ key: "a", label: undefined as unknown as string, ratio: 0.2 }],
    );
    expect(changes[0]?.label).toBe("a");
  });

  it("uses zero when the end ratio is non-finite", () => {
    const changes = computeAllocationShareChanges(
      [{ key: "a", label: "A", ratio: 0.1 }],
      [{ key: "a", label: "A", ratio: Number.NaN }],
    );
    expect(changes[0]).toMatchObject({
      startRatio: 0.1,
      endRatio: 0,
      deltaRatio: -0.1,
    });
  });

  it("uses zero when only one side has a finite ratio", () => {
    const changes = computeAllocationShareChanges(
      [{ key: "a", label: "A", ratio: Number.NaN }],
      [{ key: "a", label: "A", ratio: 0.2 }],
    );
    expect(changes[0]).toMatchObject({
      startRatio: 0,
      endRatio: 0.2,
      deltaRatio: 0.2,
    });
  });

  it("aggregates null buckets into other when collapsed slices have no values", () => {
    const series = [
      { key: "a", label: "A", values: [0.4] },
      { key: "b", label: "B", values: [0.3] },
      { key: "c", label: "C", values: [0.15] },
      { key: "d", label: "D", values: [null] },
      { key: "e", label: "E", values: [null] },
      { key: "f", label: "F", values: [null] },
      { key: "g", label: "G", values: [null] },
    ];
    const other = collapseAllocationSeries(series, 3).find(
      (item) => item.key === OTHER_ALLOCATION_KEY,
    );
    expect(other?.values[0]).toBeNull();
  });
});
