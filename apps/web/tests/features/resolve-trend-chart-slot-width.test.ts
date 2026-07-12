import { describe, expect, it } from "vitest";

import {
  estimateTrendChartLabelWidth,
  resolveTrendChartSlotWidth,
  resolveXLabelAnchor,
  truncateTrendChartLabel,
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

  it("honors a smaller target plot width", () => {
    const slotWidth = resolveTrendChartSlotWidth(["2026/6", "2026/7"], 320);
    expect(slotWidth).toBe(160);
  });

  it("estimates wide characters wider than ascii", () => {
    expect(estimateTrendChartLabelWidth("あ")).toBeGreaterThan(
      estimateTrendChartLabelWidth("a"),
    );
  });

  it("truncates long japanese instrument labels", () => {
    const label = "三菱ＵＦＪ 純金ファンド（愛称：純金積立）";
    const truncated = truncateTrendChartLabel(label);
    expect(truncated.endsWith("…")).toBe(true);
    expect(truncated.length).toBeLessThan(label.length);
    expect(estimateTrendChartLabelWidth(truncated)).toBeLessThanOrEqual(132);
  });

  it("does not truncate short date labels", () => {
    expect(truncateTrendChartLabel("2026/6/5～6/11")).toBe("2026/6/5～6/11");
  });

  it("sizes slots so truncated instrument labels do not overlap", () => {
    const labels = [
      truncateTrendChartLabel("三菱ＵＦＪ 純金ファンド（愛称：純金積立）"),
      truncateTrendChartLabel("SBI・V・全世界株式インデックス・ファンド"),
      truncateTrendChartLabel("ｅＭＡＸＩＳ Ｓｌｉｍ 米国株式（Ｓ＆Ｐ５００）"),
    ];
    const slotWidth = resolveTrendChartSlotWidth(labels);
    const firstWidth = estimateTrendChartLabelWidth(labels[0]);
    const secondWidth = estimateTrendChartLabelWidth(labels[1]);
    // first is start-anchored, second is middle-anchored
    expect(slotWidth).toBeGreaterThanOrEqual(firstWidth + secondWidth / 2 + 8);
  });
});
