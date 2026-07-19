import { describe, expect, it } from "vitest";

import { resolveTrendChartPlotLayout } from "@/features/trends/trend-chart-layout";

describe("resolveTrendChartPlotLayout", () => {
  it("keeps readable slots in inline mode", () => {
    const labels = Array.from({ length: 12 }, (_, index) => `6/${index + 1}`);
    const layout = resolveTrendChartPlotLayout({ labels, layoutMode: "inline" });
    expect(layout.pointSlotWidth).toBeGreaterThanOrEqual(56);
    expect(layout.visibleLabelIndexes).toBeNull();
    expect(layout.showPointMarkers).toBe(true);
  });

  it("fits all buckets into the measured width in expanded mode", () => {
    const labels = Array.from({ length: 100 }, (_, index) => `6/${index + 1}`);
    const layout = resolveTrendChartPlotLayout({
      labels,
      layoutMode: "expanded",
      targetPlotWidth: 1000,
      paddingLeft: 88,
      paddingRight: 16,
    });
    expect(layout.plotWidth).toBeLessThanOrEqual(1000 - 88 - 16 + 0.001);
    expect(layout.visibleLabelIndexes).not.toBeNull();
    expect(layout.visibleLabelIndexes?.has(0)).toBe(true);
    expect(layout.visibleLabelIndexes?.has(99)).toBe(true);
    expect(layout.showPointMarkers).toBe(false);
  });
});
