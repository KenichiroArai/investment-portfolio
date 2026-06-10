import { describe, expect, it } from "vitest";

import {
  ALLOCATION_CHART_COLORS,
  getAllocationChartColor,
} from "@/features/analysis/chart-colors";

describe("chart-colors", () => {
  it("returns palette colors by index", () => {
    expect(getAllocationChartColor(0)).toBe(ALLOCATION_CHART_COLORS[0]);
    expect(getAllocationChartColor(1)).toBe(ALLOCATION_CHART_COLORS[1]);
  });

  it("wraps index beyond palette length", () => {
    const wrappedIndex = ALLOCATION_CHART_COLORS.length + 2;
    expect(getAllocationChartColor(wrappedIndex)).toBe(
      ALLOCATION_CHART_COLORS[2],
    );
  });
});
