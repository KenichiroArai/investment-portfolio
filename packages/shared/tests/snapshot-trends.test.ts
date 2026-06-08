import { describe, expect, it } from "vitest";

import { buildSnapshotTrendPoint, buildSnapshotTrends } from "../src/snapshot-trends";
import type { CurrentSnapshotDto } from "../src/types";

function createSnapshot(
  asOfDate: string,
  marketValueMinor: number,
  bookValueMinor: number,
): CurrentSnapshotDto {
  let result: CurrentSnapshotDto = {
    id: `snap-${asOfDate}`,
    portfolioCode: "ideco",
    portfolioName: "iDeCo",
    asOfDate,
    analysisSchemes: [
      { schemeCode: "ideco_region", schemeName: "地域分類" },
    ],
    metrics: [],
    lines: [
      {
        id: `line-${asOfDate}`,
        instrumentId: "inst-1",
        instrumentName: "テスト銘柄",
        sortOrder: 1,
        quantity: 1,
        marketValueMinor,
        bookValueMinor,
        metrics: [],
        instrumentAttributes: [],
        tags: [
          {
            schemeCode: "ideco_region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      },
    ],
  };
  return result;
}

describe("snapshot-trends", () => {
  it("builds trend points and series", () => {
    const first = createSnapshot("2026-06-02", 100_000, 90_000);
    const second = createSnapshot("2026-06-07", 110_000, 90_000);
    const point = buildSnapshotTrendPoint(first);
    expect(point).toMatchObject({
      asOfDate: "2026-06-02",
      totalMarketValueMinor: 100_000,
      totalBookValueMinor: 90_000,
      unrealizedGainMinor: 10_000,
    });
    expect(point.allocationsByScheme.ideco_region[0]).toMatchObject({
      valueCode: "domestic",
      ratio: 1,
    });

    const trends = buildSnapshotTrends("ideco", [first, second], "2026-06-02", "2026-06-07");
    expect(trends.points).toHaveLength(2);
    expect(trends.points[1].totalMarketValueMinor).toBe(110_000);
  });
});
