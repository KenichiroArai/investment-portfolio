import { describe, expect, it } from "vitest";

import { formatTrendChartTooltipValue } from "@/features/trends/format-trend-chart-tooltip";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";

describe("formatTrendChartTooltipValue", () => {
  it("formats level delta tooltip with baseline at first bucket", () => {
    const series: TrendChartSeries = {
      key: "market-value",
      label: "評価額",
      color: "#2563eb",
      values: [3_441_347, 3_500_000],
      levelValues: [3_441_347, 3_500_000],
      baselineValue: 3_400_000,
      tooltipMode: "levelDelta",
      tooltipUnit: "yen",
    };

    expect(formatTrendChartTooltipValue(series, 0)).toContain("+￥41,347");
    expect(formatTrendChartTooltipValue(series, 0)).toContain("+1.22%");
  });

  it("formats relative rate bar tooltip with absolute suffix", () => {
    const series: TrendChartSeries = {
      key: "market-value-relative-rate",
      label: "評価額の変化率",
      color: "#2563eb",
      values: [null, 0.01],
      levelValues: [100, 101],
      tooltipMode: "relativeRateDelta",
      tooltipUnit: "yen",
    };

    expect(formatTrendChartTooltipValue(series, 1)).toBe("+1.00% (+￥1)");
  });
});
