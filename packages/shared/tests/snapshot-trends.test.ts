import { describe, expect, it } from "vitest";

import { IDECO_PORTFOLIO_METRIC_CODES } from "../src/ideco-portfolio-metrics";
import {
  buildSnapshotTrendPoint,
  buildSnapshotTrends,
  PORTFOLIO_INSTRUMENT_SCHEME_CODE,
} from "../src/snapshot-trends";
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

  it("includes contribution-based gain metrics when portfolio metric exists", () => {
    const snapshot = createSnapshot("2026-06-02", 300_000, 250_000);
    snapshot.metrics = [
      {
        code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
        integerValue: 250_000,
        realValue: null,
        textValue: null,
      },
    ];

    const point = buildSnapshotTrendPoint(snapshot, {
      schemeCodes: ["ideco_region", "missing"],
    });
    expect(point.totalContributionsMinor).toBe(250_000);
    expect(point.gainRateOnContributions).toBeCloseTo(50_000 / 250_000);
    expect(point.allocationsByScheme.missing).toEqual([]);
  });

  it("filters snapshots outside requested date range", () => {
    const first = createSnapshot("2026-06-02", 100_000, 90_000);
    const second = createSnapshot("2026-06-07", 110_000, 90_000);
    const trends = buildSnapshotTrends("ideco", [first, second], "2026-06-07", "2026-06-07");
    expect(trends.points).toHaveLength(1);
    expect(trends.points[0]?.asOfDate).toBe("2026-06-07");
  });

  it("includes instrument allocation slices that sum to 100%", () => {
    const snapshot = createSnapshot("2026-06-02", 100_000, 90_000);
    snapshot.lines = [
      {
        ...snapshot.lines[0],
        id: "line-a",
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        sortOrder: 1,
        marketValueMinor: 60_000,
      },
      {
        ...snapshot.lines[0],
        id: "line-b",
        instrumentId: "inst-b",
        instrumentName: "銘柄B",
        sortOrder: 2,
        marketValueMinor: 40_000,
      },
    ];

    const point = buildSnapshotTrendPoint(snapshot);
    const instrumentSlices = point.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE];

    expect(instrumentSlices).toHaveLength(2);
    expect(instrumentSlices.map((slice) => slice.valueCode)).toEqual(["inst-a", "inst-b"]);
    expect(instrumentSlices[0]).toMatchObject({
      valueName: "銘柄A",
      ratio: 0.6,
      marketValueMinor: 60_000,
      sortOrder: 1,
    });
    expect(instrumentSlices[1]).toMatchObject({
      valueName: "銘柄B",
      ratio: 0.4,
      marketValueMinor: 40_000,
    });
    expect(instrumentSlices.reduce((sum, slice) => sum + slice.ratio, 0)).toBeCloseTo(1);
  });

  it("includes instrument allocation on every buildSnapshotTrends point", () => {
    const first = createSnapshot("2026-06-02", 100_000, 90_000);
    first.lines = [
      {
        ...first.lines[0],
        id: "line-a",
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        sortOrder: 1,
        marketValueMinor: 60_000,
      },
      {
        ...first.lines[0],
        id: "line-b",
        instrumentId: "inst-b",
        instrumentName: "銘柄B",
        sortOrder: 2,
        marketValueMinor: 40_000,
      },
    ];

    const second = createSnapshot("2026-06-07", 110_000, 90_000);
    second.lines = [...first.lines];
    second.lines[0] = { ...second.lines[0], marketValueMinor: 66_000 };
    second.lines[1] = { ...second.lines[1], marketValueMinor: 44_000 };

    const trends = buildSnapshotTrends("ideco", [first, second], "2026-06-02", "2026-06-07");

    expect(trends.points).toHaveLength(2);
    for (const point of trends.points) {
      const instrumentSlices = point.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE];
      expect(instrumentSlices.length).toBeGreaterThan(0);
      expect(instrumentSlices.reduce((sum, slice) => sum + slice.ratio, 0)).toBeCloseTo(1);
    }
  });

  it("handles instrument additions and removals across trend points", () => {
    const first = createSnapshot("2026-06-02", 100_000, 90_000);
    first.lines = [
      {
        ...first.lines[0],
        id: "line-a",
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        sortOrder: 1,
        marketValueMinor: 100_000,
      },
    ];

    const second = createSnapshot("2026-06-07", 110_000, 90_000);
    second.lines = [
      {
        ...second.lines[0],
        id: "line-b",
        instrumentId: "inst-b",
        instrumentName: "銘柄B",
        sortOrder: 1,
        marketValueMinor: 110_000,
      },
    ];

    const firstPoint = buildSnapshotTrendPoint(first);
    const secondPoint = buildSnapshotTrendPoint(second);

    expect(firstPoint.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE]).toEqual([
      {
        valueCode: "inst-a",
        valueName: "銘柄A",
        marketValueMinor: 100_000,
        ratio: 1,
        sortOrder: 1,
      },
    ]);
    expect(secondPoint.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE]).toEqual([
      {
        valueCode: "inst-b",
        valueName: "銘柄B",
        marketValueMinor: 110_000,
        ratio: 1,
        sortOrder: 1,
      },
    ]);
  });

  it("uses zero ratio when total market value is zero", () => {
    const snapshot = createSnapshot("2026-06-02", 0, 0);
    snapshot.lines = [
      {
        ...snapshot.lines[0],
        id: "line-a",
        instrumentId: "inst-a",
        instrumentName: "銘柄A",
        sortOrder: 1,
        marketValueMinor: 0,
      },
    ];

    const point = buildSnapshotTrendPoint(snapshot);
    const instrumentSlices = point.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE];

    expect(instrumentSlices[0]?.ratio).toBe(0);
  });
});
