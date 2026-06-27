import { describe, expect, it } from "vitest";

import { buildTrendsTabSummarySegments } from "@/features/portfolio-allocation/buildPortfolioTabSummaries";

describe("buildTrendsTabSummarySegments", () => {
  it("places largest share change segment first", () => {
    let result = buildTrendsTabSummarySegments({
      startDateLabel: "2026/05/31",
      endDateLabel: "2026/06/07",
      startMarketValueMinor: 3_400_000,
      endMarketValueMinor: 3_441_347,
      metricDeltas: [
        {
          key: "market-value",
          label: "評価額",
          start: 3_400_000,
          end: 3_441_347,
          absoluteDelta: 41_347,
          relativeRate: 41_347 / 3_400_000,
          unit: "yen",
        },
      ],
      largestShareChange: {
        key: "inst-a",
        label: "銘柄A",
        startRatio: 0.6,
        endRatio: 0.61,
        deltaRatio: 0.01,
      },
    });

    expect(result[0]?.label).toBe("最大シェア変動");
    expect(result[0]?.value).toContain("銘柄A");
    expect(result[1]?.label).toBe("期首");
  });
});
