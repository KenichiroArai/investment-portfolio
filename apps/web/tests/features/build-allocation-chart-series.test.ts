import { describe, expect, it } from "vitest";

import { buildAllocationChartSeries } from "@/features/trends/build-allocation-chart-series";
import { OTHER_ALLOCATION_KEY } from "@repo/shared";

describe("buildAllocationChartSeries", () => {
  it("returns all compositions without collapsing into その他", () => {
    const chartPoints = [
      {
        asOfDate: "2026-06-01",
        sourceAsOfDate: "2026-06-01",
        totalMarketValueMinor: 1_000_000,
        totalBookValueMinor: 900_000,
        unrealizedGainMinor: 100_000,
        gainRateOnBook: 0.1,
        totalContributionsMinor: null,
        gainRateOnContributions: null,
        allocationsByScheme: {
          ideco_asset_class: Array.from({ length: 8 }, (_, index) => ({
            valueCode: `class-${index}`,
            valueName: `分類${index}`,
            marketValueMinor: 100_000,
            ratio: 0.125,
          })),
        },
      },
    ];

    const series = buildAllocationChartSeries(chartPoints, "ideco_asset_class");

    expect(series).toHaveLength(8);
    expect(series.some((item) => item.key === OTHER_ALLOCATION_KEY)).toBe(false);
    expect(series.map((item) => item.label)).toEqual([
      "分類0",
      "分類1",
      "分類2",
      "分類3",
      "分類4",
      "分類5",
      "分類6",
      "分類7",
    ]);
  });
});
