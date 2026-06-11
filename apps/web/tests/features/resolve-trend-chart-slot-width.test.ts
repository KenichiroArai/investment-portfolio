import { describe, expect, it } from "vitest";

import {
  resolveTrendChartSlotWidth,
  resolveXLabelAnchor,
} from "@/features/trends/resolve-trend-chart-slot-width";

describe("resolveTrendChartSlotWidth", () => {
  it("resolves x label anchors for edge and middle buckets", () => {
    expect(resolveXLabelAnchor(0, 3)).toBe("start");
    expect(resolveXLabelAnchor(1, 3)).toBe("middle");
    expect(resolveXLabelAnchor(2, 3)).toBe("end");
  });

  it("widens slots when baseline and range labels would overlap", () => {
    const slotWidth = resolveTrendChartSlotWidth(["2026/6/2", "2026/6/5～6/11"]);
    expect(slotWidth).toBeGreaterThan(150);
  });

  it("keeps compact slots for many short labels", () => {
    const labels = Array.from({ length: 12 }, (_, index) => `2026/6/${index + 1}`);
    const slotWidth = resolveTrendChartSlotWidth(labels);
    expect(slotWidth).toBeGreaterThanOrEqual(56);
    expect(slotWidth).toBeLessThan(120);
  });
});
