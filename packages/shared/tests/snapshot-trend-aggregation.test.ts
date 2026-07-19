import { describe, expect, it } from "vitest";

import {
  __snapshotTrendAggregationTesting,
  aggregateTrendPoints,
  aggregateTrendPointsByCalendarMonth,
  buildTrendDisplayPoints,
  formatTrendBucketLabel,
  formatTrendSparseDataNote,
  readTrendBucketPick,
  readTrendDisplayUnit,
  readTrendMinMaxField,
  TREND_MIN_MAX_FIELD_LABELS,
  TREND_MIN_MAX_FIELDS,
} from "../src/snapshot-trend-aggregation";
import { PORTFOLIO_INSTRUMENT_SCHEME_CODE } from "../src/portfolio-instrument-scheme";
import type { SnapshotTrendPointDto } from "../src/snapshot-trends";

function createPoint(
  asOfDate: string,
  marketValue: number,
  overrides: Partial<SnapshotTrendPointDto> = {},
): SnapshotTrendPointDto {
  let result: SnapshotTrendPointDto = {
    asOfDate,
    totalMarketValueMinor: marketValue,
    totalBookValueMinor: marketValue - 1000,
    unrealizedGainMinor: 1000,
    gainRateOnBook: 0.01,
    totalContributionsMinor: null,
    gainRateOnContributions: null,
    allocationsByScheme: {},
    ...overrides,
  };
  return result;
}

describe("snapshot-trend-aggregation", () => {
  it("labels every min max field", () => {
    for (const field of TREND_MIN_MAX_FIELDS) {
      expect(TREND_MIN_MAX_FIELD_LABELS[field]).toEqual(expect.any(String));
    }
  });

  it("reads display unit from query value", () => {
    expect(readTrendDisplayUnit(null)).toBe("day");
    expect(readTrendDisplayUnit("week")).toBe("week");
    expect(readTrendDisplayUnit("3m")).toBe("3m");
    expect(readTrendDisplayUnit("invalid")).toBe("day");
  });

  it("keeps daily points when unit is day", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
    ];
    const aggregated = aggregateTrendPoints(points, "day", "2026-06-01", "2026-06-30");
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0].bucketLabel).toBe("2026/6/2");
    expect(aggregated[1].bucketLabel).toBe("2026/6/7");
  });

  it("aggregates by rolling week using latest as-of date in each week", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-05", 150),
      createPoint("2026-06-09", 200),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "last" },
    );
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-06-07",
      bucketLabel: "2026/6/7",
      sourceAsOfDate: "2026-06-05",
      totalMarketValueMinor: 150,
    });
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-06-14",
      bucketLabel: "2026/6/14",
      sourceAsOfDate: "2026-06-09",
      totalMarketValueMinor: 200,
    });
  });

  it("aggregates by rolling 1 month using latest as-of date in each bucket", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
      createPoint("2026-07-15", 300),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "1m",
      "2026-06-01",
      "2026-07-31",
      { pick: "last" },
    );
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-07-01",
      bucketLabel: "2026/6/1～7/1",
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 200,
    });
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-07-31",
      bucketLabel: "2026/7/2～7/31",
      sourceAsOfDate: "2026-07-15",
      totalMarketValueMinor: 300,
    });
  });

  it("aggregates by rolling 3 months using latest as-of date in each bucket", () => {
    const points = [
      createPoint("2026-02-10", 100),
      createPoint("2026-05-31", 200),
      createPoint("2026-06-07", 300),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "3m",
      "2026-01-15",
      "2026-06-30",
      { pick: "last" },
    );
    expect(aggregated).toHaveLength(2);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-04-15",
      bucketLabel: "2026/1/15～4/15",
      sourceAsOfDate: "2026-02-10",
      totalMarketValueMinor: 100,
    });
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-06-30",
      bucketLabel: "2026/4/16～6/30",
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 300,
    });
  });

  it("produces one bucket when 3-month period matches 3-month display unit", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
      createPoint("2026-06-09", 250),
      createPoint("2026-06-10", 280),
      createPoint("2026-06-11", 300),
    ];
    const built = buildTrendDisplayPoints(points, "3m", "2026-03-11", "2026-06-11", {
      pick: "last",
    });
    expect(built.displayPoints).toHaveLength(1);
    expect(built.displayPoints[0]).toMatchObject({
      bucketKey: "2026-06-11",
      bucketLabel: "2026/3/11～6/11",
      sourceAsOfDate: "2026-06-11",
      totalMarketValueMinor: 300,
    });
  });

  it("splits display points and baseline from fetched range", () => {
    const points = [
      createPoint("2026-05-31", 100),
      createPoint("2026-06-02", 150),
      createPoint("2026-06-07", 200),
    ];
    const built = buildTrendDisplayPoints(points, "day", "2026-06-01", "2026-06-30");
    expect(built.baselinePoint).toMatchObject({
      sourceAsOfDate: "2026-05-31",
      totalMarketValueMinor: 100,
    });
    expect(built.displayPoints).toHaveLength(2);
    expect(built.displayPoints[0]?.sourceAsOfDate).toBe("2026-06-02");
    expect(built.displayPoints[1]?.sourceAsOfDate).toBe("2026-06-07");
  });

  it("uses raw prior snapshot as baseline for non-day units", () => {
    const points = [
      createPoint("2026-05-31", 100),
      createPoint("2026-06-07", 200),
    ];
    const built = buildTrendDisplayPoints(points, "1m", "2026-06-01", "2026-06-30");
    expect(built.baselinePoint).toMatchObject({
      sourceAsOfDate: "2026-05-31",
      totalMarketValueMinor: 100,
    });
    expect(built.displayPoints).toHaveLength(1);
  });

  it("formats bucket labels", () => {
    expect(formatTrendBucketLabel("2026-06-07", "day")).toBe("2026/6/7");
    expect(formatTrendBucketLabel("2026-06-07", "week")).toBe("2026/6/7");
    expect(formatTrendBucketLabel("2026-07-01", "1m", "2026-06-01")).toBe("2026/6/1～7/1");
    expect(formatTrendBucketLabel("unknown", "1m")).toBe("unknown");
  });

  it("formats sparse data note when range starts before first snapshot", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-07", 200),
    ];
    expect(formatTrendSparseDataNote("2026-03-11", points)).toBe(
      "選択期間のうち 2026/6/2 以降にデータがあります",
    );
    expect(formatTrendSparseDataNote("2026-06-02", points)).toBeNull();
  });

  it("returns empty aggregation for no points", () => {
    expect(aggregateTrendPoints([], "1m", "2026-06-01", "2026-06-30")).toEqual([]);
    expect(aggregateTrendPoints([], "day", "2026-06-01", "2026-06-30")).toEqual([]);
  });

  it("reads bucket pick and min/max field from query value", () => {
    expect(readTrendBucketPick(null)).toBe("firstLast");
    expect(readTrendBucketPick("first")).toBe("first");
    expect(readTrendBucketPick("last")).toBe("last");
    expect(readTrendBucketPick("firstLast")).toBe("firstLast");
    expect(readTrendBucketPick("average")).toBe("average");
    expect(readTrendBucketPick("invalid")).toBe("firstLast");
    expect(readTrendMinMaxField(null)).toBe("marketValue");
    expect(readTrendMinMaxField("unrealizedGain")).toBe("unrealizedGain");
    expect(readTrendMinMaxField("invalid")).toBe("marketValue");
  });

  it("aggregates by rolling week using first as-of date in each week", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-05", 150),
      createPoint("2026-06-09", 200),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "first" },
    );
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-06-02",
      totalMarketValueMinor: 100,
    });
    expect(aggregated[1]).toMatchObject({
      sourceAsOfDate: "2026-06-09",
      totalMarketValueMinor: 200,
    });
  });

  it("aggregates firstLast as first bucket opening and later buckets closing", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-05", 150),
      createPoint("2026-06-09", 200),
      createPoint("2026-06-12", 250),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "firstLast" },
    );
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-06-02",
      totalMarketValueMinor: 100,
    });
    expect(aggregated[1]).toMatchObject({
      sourceAsOfDate: "2026-06-12",
      totalMarketValueMinor: 250,
    });
  });

  it("aggregates by min market value in each bucket", () => {
    const points = [
      createPoint("2026-06-02", 300),
      createPoint("2026-06-05", 150),
      createPoint("2026-06-09", 200),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "min", minMaxField: "marketValue" },
    );
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-06-05",
      totalMarketValueMinor: 150,
    });
  });

  it("aggregates by max unrealized gain in each bucket", () => {
    const points = [
      createPoint("2026-06-02", 300, { unrealizedGainMinor: 500 }),
      createPoint("2026-06-05", 150, { unrealizedGainMinor: 2000 }),
      createPoint("2026-06-09", 200, { unrealizedGainMinor: 800 }),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "max", minMaxField: "unrealizedGain" },
    );
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-06-05",
      unrealizedGainMinor: 2000,
    });
  });

  it("falls back to last when min comparison values are all null", () => {
    const points = [
      createPoint("2026-06-02", 100, { totalContributionsMinor: null }),
      createPoint("2026-06-05", 150, { totalContributionsMinor: null }),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "min", minMaxField: "contributions" },
    );
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-06-05",
      totalMarketValueMinor: 150,
    });
  });

  it("aggregates by average in each bucket", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-05", 200),
      createPoint("2026-06-09", 300),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "average" },
    );
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-06-07",
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 150,
      isAveraged: true,
    });
    expect(aggregated[1]).toMatchObject({
      sourceAsOfDate: "2026-06-14",
      totalMarketValueMinor: 300,
      isAveraged: true,
    });
  });

  it("averages allocations by scheme in each bucket", () => {
    const points = [
      createPoint("2026-06-02", 100, {
        allocationsByScheme: {
          asset: [
            {
              valueCode: "stock",
              valueName: "株式",
              marketValueMinor: 6000,
              ratio: 0.6,
            },
            {
              valueCode: "bond",
              valueName: "債券",
              marketValueMinor: 4000,
              ratio: 0.4,
            },
          ],
        },
      }),
      createPoint("2026-06-05", 200, {
        allocationsByScheme: {
          asset: [
            {
              valueCode: "stock",
              valueName: "株式",
              marketValueMinor: 8000,
              ratio: 0.8,
            },
            {
              valueCode: "bond",
              valueName: "債券",
              marketValueMinor: 2000,
              ratio: 0.2,
            },
          ],
        },
      }),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "average" },
    );
    const slices = aggregated[0]?.allocationsByScheme.asset ?? [];
    expect(slices).toHaveLength(2);
    const stock = slices.find((slice) => slice.valueCode === "stock");
    const bond = slices.find((slice) => slice.valueCode === "bond");
    expect(stock?.ratio).toBeCloseTo(0.7);
    expect(bond?.ratio).toBeCloseTo(0.3);
  });

  it("returns empty display points when no snapshots exist", () => {
    expect(
      buildTrendDisplayPoints([], "day", "2026-06-01", "2026-06-30"),
    ).toEqual({
      displayPoints: [],
      baselinePoint: null,
    });
  });

  it("returns null sparse note for empty in-range points", () => {
    expect(formatTrendSparseDataNote("2026-06-01", [])).toBeNull();
  });

  it("aggregates by rolling 6 and 12 month buckets", () => {
    const points = [
      createPoint("2026-01-15", 100),
      createPoint("2026-04-15", 200),
      createPoint("2026-07-15", 300),
      createPoint("2027-01-15", 400),
    ];
    const sixMonth = aggregateTrendPoints(points, "6m", "2026-01-15", "2027-01-15", {
      pick: "last",
    });
    expect(sixMonth).toHaveLength(2);
    expect(sixMonth[0]).toMatchObject({
      bucketKey: "2026-07-15",
      sourceAsOfDate: "2026-07-15",
      totalMarketValueMinor: 300,
    });
    expect(sixMonth[1]).toMatchObject({
      bucketKey: "2027-01-15",
      sourceAsOfDate: "2027-01-15",
      totalMarketValueMinor: 400,
    });

    const twelveMonth = aggregateTrendPoints(
      points,
      "12m",
      "2026-01-15",
      "2027-01-15",
      { pick: "last" },
    );
    expect(twelveMonth).toHaveLength(1);
    expect(twelveMonth[0]).toMatchObject({
      bucketKey: "2027-01-15",
      sourceAsOfDate: "2027-01-15",
      totalMarketValueMinor: 400,
    });
  });

  it("formats cross-year bucket labels", () => {
    expect(formatTrendBucketLabel("2027-01-15", "12m", "2026-02-01")).toBe(
      "2026/2/1～2027/1/15",
    );
  });

  it("aggregates by min book value and max gain rates", () => {
    const points = [
      createPoint("2026-06-02", 300, {
        totalBookValueMinor: 250,
        gainRateOnBook: 0.2,
        gainRateOnContributions: 0.1,
      }),
      createPoint("2026-06-05", 150, {
        totalBookValueMinor: 120,
        gainRateOnBook: 0.25,
        gainRateOnContributions: 0.15,
      }),
      createPoint("2026-06-09", 200, {
        totalBookValueMinor: 180,
        gainRateOnBook: 0.25,
        gainRateOnContributions: 0.05,
      }),
    ];
    const minBook = aggregateTrendPoints(points, "week", "2026-06-01", "2026-06-30", {
      pick: "min",
      minMaxField: "bookValue",
    });
    expect(minBook[0]).toMatchObject({
      sourceAsOfDate: "2026-06-05",
      totalBookValueMinor: 120,
    });

    const maxGainRate = aggregateTrendPoints(points, "week", "2026-06-01", "2026-06-30", {
      pick: "max",
      minMaxField: "gainRateOnBook",
    });
    expect(maxGainRate[0]).toMatchObject({
      sourceAsOfDate: "2026-06-05",
      gainRateOnBook: 0.25,
    });

    const maxContributionsGain = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "max", minMaxField: "gainRateOnContributions" },
    );
    expect(maxContributionsGain[0]).toMatchObject({
      sourceAsOfDate: "2026-06-05",
      gainRateOnContributions: 0.15,
    });
  });

  it("prefers newer snapshot when min/max values tie", () => {
    const points = [
      createPoint("2026-06-02", 100),
      createPoint("2026-06-05", 150),
      createPoint("2026-06-07", 150),
    ];
    const aggregated = aggregateTrendPoints(points, "week", "2026-06-01", "2026-06-30", {
      pick: "max",
      minMaxField: "marketValue",
    });
    expect(aggregated[0]).toMatchObject({
      sourceAsOfDate: "2026-06-07",
      totalMarketValueMinor: 150,
    });
  });

  it("skips points that do not resolve to a rolling bucket", () => {
    const points = [createPoint("invalid-date", 100)];
    expect(aggregateTrendPoints(points, "week", "2026-06-01", "2026-06-30")).toEqual([]);
  });

  it("covers internal date and bucket helpers", () => {
    const {
      parseIsoDate,
      daysBetween,
      minIsoDate,
      resolveRollingBucketIndex,
      resolveRollingBucketStartDate,
      resolveRollingBucketEndDate,
      resolveRollingBucketKey,
      resolveMinMaxComparableValue,
      averageBucketPoints,
      resolveBucketPoint,
    } = __snapshotTrendAggregationTesting;

    expect(parseIsoDate("bad")).toBeNull();
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-06-01")?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(daysBetween("bad", "2026-06-01")).toBeNull();
    expect(daysBetween("2026-06-10", "2026-06-01")).toBeNull();
    expect(minIsoDate("2026-06-10", "2026-06-01")).toBe("2026-06-01");
    expect(resolveRollingBucketIndex("2026-06-02", "day", "2026-06-01")).toBeNull();
    expect(resolveRollingBucketStartDate(0, "day", "2026-06-01")).toBeNull();
    expect(resolveRollingBucketEndDate(0, "day", "2026-06-01", "2026-06-30")).toBeNull();
    expect(
      resolveRollingBucketKey("2026-06-02", "day", "2026-06-01", "2026-06-30"),
    ).toBeNull();
    expect(resolveRollingBucketIndex("invalid", "week", "2026-06-01")).toBeNull();
    expect(resolveRollingBucketIndex("2026-01-01", "week", "invalid")).toBeNull();
    expect(resolveRollingBucketStartDate(0, "week", "invalid")).toBeNull();
    expect(resolveRollingBucketEndDate(0, "week", "invalid", "2026-06-30")).toBeNull();

    const point = createPoint("2026-06-02", 100, {
      totalBookValueMinor: Number.NaN,
      gainRateOnBook: null,
      totalContributionsMinor: Number.POSITIVE_INFINITY,
      gainRateOnContributions: Number.NaN,
    });
    expect(
      resolveMinMaxComparableValue(
        createPoint("2026-06-02", 100, { unrealizedGainMinor: Number.NaN }),
        "unrealizedGain",
      ),
    ).toBeNull();
    expect(resolveMinMaxComparableValue(point, "bookValue")).toBeNull();
    expect(resolveMinMaxComparableValue(point, "gainRateOnBook")).toBeNull();
    expect(resolveMinMaxComparableValue(point, "contributions")).toBeNull();
    expect(resolveMinMaxComparableValue(point, "gainRateOnContributions")).toBeNull();
    expect(resolveMinMaxComparableValue(createPoint("2026-06-02", 100), "marketValue")).toBe(
      100,
    );

    expect(averageBucketPoints([], "2026-06-02")).toBeNull();
    expect(
      averageBucketPoints(
        [
          createPoint("2026-06-02", Number.NaN, {
            totalBookValueMinor: Number.NaN,
            unrealizedGainMinor: Number.NaN,
          }),
        ],
        "2026-06-02",
      ),
    ).toMatchObject({
      totalMarketValueMinor: 0,
      totalBookValueMinor: 0,
      unrealizedGainMinor: 0,
    });
    const { averageAllocationsByScheme } = __snapshotTrendAggregationTesting;
    expect(
      averageAllocationsByScheme([
        createPoint("2026-06-02", 100, {
          allocationsByScheme: {
            asset: [
              {
                valueCode: "stock",
                valueName: "株式",
                marketValueMinor: 10_000,
                ratio: 1,
              },
            ],
          },
        }),
        createPoint("2026-06-05", 200),
      ]).asset,
    ).toHaveLength(1);
    expect(resolveBucketPoint([], "last", "marketValue", "2026-06-02")).toBeNull();
    expect(
      resolveBucketPoint(
        [createPoint("2026-06-02", 100)],
        "average",
        "marketValue",
        "2026-06-07",
      ),
    ).toMatchObject({ isAveraged: true });
    expect(resolveRollingBucketIndex("2026-05-01", "week", "2026-06-01")).toBeNull();
    expect(resolveRollingBucketIndex("2026-01-01", "1m", "2026-06-01")).toBeNull();
    expect(resolveRollingBucketIndex("2026-06-15", "1m", "2026-06-01")).toBe(0);
    expect(resolveRollingBucketIndex("2026-08-15", "1m", "2026-06-01")).toBe(2);
    expect(
      resolveRollingBucketKey("2026-06-02", "week", "invalid", "2026-06-30"),
    ).toBeNull();
    expect(
      resolveMinMaxComparableValue(
        createPoint("2026-06-02", 100, { unrealizedGainMinor: 500 }),
        "unrealizedGain",
      ),
    ).toBe(500);
    expect(
      resolveMinMaxComparableValue(
        createPoint("2026-06-02", 100, { totalContributionsMinor: 1_000 }),
        "contributions",
      ),
    ).toBe(1_000);
    expect(
      resolveMinMaxComparableValue(
        {
          ...createPoint("2026-06-02", 100),
          totalContributionsMinor: undefined,
        },
        "contributions",
      ),
    ).toBeNull();
    expect(
      resolveMinMaxComparableValue(
        createPoint("2026-06-02", 100, { gainRateOnContributions: 0.05 }),
        "gainRateOnContributions",
      ),
    ).toBe(0.05);
    expect(
      resolveMinMaxComparableValue(createPoint("2026-06-02", Number.NaN), "marketValue"),
    ).toBeNull();
    expect(
      resolveRollingBucketKey("2026-06-02", "week", "2026-06-01", "2026-06-30"),
    ).toBe("2026-06-07");
    const { toAggregatedTrendPoint, resolveAggregationOptions } =
      __snapshotTrendAggregationTesting;
    expect(resolveAggregationOptions()).toEqual({
      pick: "firstLast",
      minMaxField: "marketValue",
    });
    expect(resolveAggregationOptions({ pick: "first" }).pick).toBe("first");
    const aggregated = toAggregatedTrendPoint(
      createPoint("2026-06-02", 100),
      "2026-07-01",
      "1m",
      null,
      false,
    );
    expect(aggregated.bucketLabel).toBe("2026/7/1");
  });

  it("averages allocations when a composition is missing from some snapshots", () => {
    const points = [
      createPoint("2026-06-02", 100, {
        allocationsByScheme: {
          asset: [
            {
              valueCode: "stock",
              valueName: "株式",
              marketValueMinor: 6000,
              ratio: 0.6,
            },
          ],
        },
      }),
      createPoint("2026-06-05", 200, {
        allocationsByScheme: {
          asset: [
            {
              valueCode: "stock",
              valueName: "株式",
              marketValueMinor: 8000,
              ratio: 0.8,
            },
            {
              valueCode: "bond",
              valueName: "債券",
              marketValueMinor: 2000,
              ratio: 0.2,
            },
          ],
        },
      }),
    ];
    const aggregated = aggregateTrendPoints(
      points,
      "week",
      "2026-06-01",
      "2026-06-30",
      { pick: "average" },
    );
    const slices = aggregated[0]?.allocationsByScheme.asset ?? [];
    expect(slices.some((slice) => slice.valueCode === "bond")).toBe(true);
    expect(slices.some((slice) => slice.valueCode === "stock")).toBe(true);
  });

  it("preserves sortOrder when averaging allocation slices", () => {
    const points = [
      createPoint("2026-06-02", 100, {
        allocationsByScheme: {
          [PORTFOLIO_INSTRUMENT_SCHEME_CODE]: [
            {
              valueCode: "inst-a",
              valueName: "銘柄A",
              marketValueMinor: 60_000,
              ratio: 0.6,
              sortOrder: 1,
            },
            {
              valueCode: "inst-b",
              valueName: "銘柄B",
              marketValueMinor: 40_000,
              ratio: 0.4,
              sortOrder: 2,
            },
          ],
        },
      }),
      createPoint("2026-06-05", 100, {
        allocationsByScheme: {
          [PORTFOLIO_INSTRUMENT_SCHEME_CODE]: [
            {
              valueCode: "inst-a",
              valueName: "銘柄A",
              marketValueMinor: 50_000,
              ratio: 0.5,
              sortOrder: 1,
            },
            {
              valueCode: "inst-b",
              valueName: "銘柄B",
              marketValueMinor: 50_000,
              ratio: 0.5,
              sortOrder: 2,
            },
          ],
        },
      }),
    ];
    const aggregated = aggregateTrendPoints(points, "week", "2026-06-01", "2026-06-30", {
      pick: "average",
    });
    const slices =
      aggregated[0]?.allocationsByScheme[PORTFOLIO_INSTRUMENT_SCHEME_CODE] ?? [];
    expect(slices.find((slice) => slice.valueCode === "inst-a")?.sortOrder).toBe(1);
    expect(slices.find((slice) => slice.valueCode === "inst-b")?.sortOrder).toBe(2);
  });

  it("skips buckets when rolling end date cannot be resolved", () => {
    const points = [createPoint("2026-06-02", 100)];
    expect(aggregateTrendPoints(points, "week", "invalid", "2026-06-30")).toEqual([]);
  });

  it("aggregates by calendar month using period-end snapshot by default", () => {
    const points = [
      createPoint("2025-12-10", 100),
      createPoint("2026-01-05", 110),
      createPoint("2026-01-28", 120),
      createPoint("2026-02-15", 130),
      createPoint("2026-03-01", 140),
    ];
    const aggregated = aggregateTrendPointsByCalendarMonth(
      points,
      "2025-12-01",
      "2026-03-31",
      { pick: "last" },
    );

    expect(aggregated.map((point) => point.bucketLabel)).toEqual([
      "12月",
      "1月",
      "2月",
      "3月",
    ]);
    expect(aggregated[1]).toMatchObject({
      bucketKey: "2026-01",
      sourceAsOfDate: "2026-01-28",
      totalMarketValueMinor: 120,
    });
    expect(aggregated[2]).toMatchObject({
      bucketKey: "2026-02",
      sourceAsOfDate: "2026-02-15",
      totalMarketValueMinor: 130,
    });
  });

  it("excludes calendar months outside the selected range", () => {
    const points = [
      createPoint("2025-11-30", 90),
      createPoint("2026-01-31", 110),
      createPoint("2026-04-01", 150),
    ];
    const aggregated = aggregateTrendPointsByCalendarMonth(
      points,
      "2026-01-01",
      "2026-03-31",
    );
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].bucketLabel).toBe("1月");
  });

  it("returns empty calendar month aggregation for no points", () => {
    expect(
      aggregateTrendPointsByCalendarMonth([], "2026-01-01", "2026-12-31"),
    ).toEqual([]);
  });

  it("skips calendar month points with invalid date format", () => {
    const points = [
      createPoint("2026-06-1x", 100),
      createPoint("2026-06-15", 110),
    ];
    const aggregated = aggregateTrendPointsByCalendarMonth(
      points,
      "2026-01-01",
      "2026-12-31",
    );
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]).toMatchObject({
      bucketKey: "2026-06",
      totalMarketValueMinor: 110,
    });
  });

  it("uses year-month as source date for averaged calendar month buckets", () => {
    const points = [
      createPoint("2026-01-10", 100),
      createPoint("2026-01-20", 200),
    ];
    const aggregated = aggregateTrendPointsByCalendarMonth(
      points,
      "2026-01-01",
      "2026-12-31",
      { pick: "average" },
    );
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0]).toMatchObject({
      asOfDate: "2026-01",
      sourceAsOfDate: "2026-01",
      bucketKey: "2026-01",
      totalMarketValueMinor: 150,
      isAveraged: true,
    });
  });
});
