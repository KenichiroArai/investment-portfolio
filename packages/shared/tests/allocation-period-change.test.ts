import { describe, expect, it } from "vitest";

import {
  __allocationPeriodChangeTesting,
  buildAllocationPeriodChangeRows,
  buildAllocationRatioSeries,
  sortAllocationPeriodChangeRows,
  type AllocationPeriodChangeRow,
} from "../src/allocation-period-change";
import type { AggregatedTrendPoint } from "../src/snapshot-trend-aggregation";

function makePoint(
  asOfDate: string,
  schemeCode: string,
  slices: Array<{
    valueCode: string;
    valueName: string;
    marketValueMinor: number;
    ratio: number;
  }>,
): AggregatedTrendPoint {
  let result: AggregatedTrendPoint = {
    asOfDate,
    totalMarketValueMinor: slices.reduce((sum, slice) => sum + slice.marketValueMinor, 0),
    totalBookValueMinor: 0,
    unrealizedGainMinor: 0,
    gainRateOnBook: null,
    totalContributionsMinor: null,
    gainRateOnContributions: null,
    allocationsByScheme: {
      [schemeCode]: slices,
    },
    bucketKey: asOfDate,
    bucketLabel: asOfDate,
    sourceAsOfDate: asOfDate,
  };
  return result;
}

describe("allocation-period-change", () => {
  const schemeCode = "ideco_region";
  const start = makePoint("2026-05-31", schemeCode, [
    {
      valueCode: "domestic",
      valueName: "国内",
      marketValueMinor: 2_000_000,
      ratio: 0.6,
    },
    {
      valueCode: "foreign",
      valueName: "海外",
      marketValueMinor: 1_400_000,
      ratio: 0.4,
    },
  ]);
  const middle = makePoint("2026-06-03", schemeCode, [
    {
      valueCode: "domestic",
      valueName: "国内",
      marketValueMinor: 2_050_000,
      ratio: 0.62,
    },
    {
      valueCode: "foreign",
      valueName: "海外",
      marketValueMinor: 1_250_000,
      ratio: 0.38,
    },
  ]);
  const end = makePoint("2026-06-07", schemeCode, [
    {
      valueCode: "domestic",
      valueName: "国内",
      marketValueMinor: 2_100_000,
      ratio: 0.61,
    },
    {
      valueCode: "foreign",
      valueName: "海外",
      marketValueMinor: 1_341_347,
      ratio: 0.39,
    },
  ]);
  const chartPoints = [start, middle, end];

  it("builds ratio series for all compositions", () => {
    const series = buildAllocationRatioSeries(chartPoints, schemeCode);
    expect(series).toHaveLength(2);
    const domestic = series.find((item) => item.key === "domestic");
    expect(domestic?.values).toEqual([0.6, 0.62, 0.61]);
  });

  it("builds period change rows with ratio series", () => {
    const rows = buildAllocationPeriodChangeRows(start, end, chartPoints, schemeCode);
    expect(rows).toHaveLength(2);
    const domestic = rows.find((item) => item.key === "domestic");
    expect(domestic?.deltaRatio).toBeCloseTo(0.01);
    expect(domestic?.relativeRate).toBeCloseTo(0.01 / 0.6);
    expect(domestic?.deltaMarketValueMinor).toBe(100_000);
    expect(domestic?.ratioSeries).toEqual([0.6, 0.62, 0.61]);
    expect(Math.abs(rows[0].deltaRatio)).toBeGreaterThanOrEqual(
      Math.abs(rows[1].deltaRatio),
    );
  });

  it("sorts rows by absolute delta ratio", () => {
    const rows: AllocationPeriodChangeRow[] = [
      {
        key: "a",
        label: "A",
        startRatio: 0.1,
        endRatio: 0.12,
        deltaRatio: 0.02,
        relativeRate: 0.2,
        startMarketValueMinor: 100,
        endMarketValueMinor: 120,
        deltaMarketValueMinor: 20,
        ratioSeries: [0.1, 0.12],
      },
      {
        key: "b",
        label: "B",
        startRatio: 0.5,
        endRatio: 0.4,
        deltaRatio: -0.1,
        relativeRate: -0.2,
        startMarketValueMinor: 500,
        endMarketValueMinor: 400,
        deltaMarketValueMinor: -100,
        ratioSeries: [0.5, 0.4],
      },
    ];
    const sorted = sortAllocationPeriodChangeRows(rows, "deltaRatio", "desc", true);
    expect(sorted[0].key).toBe("b");
  });

  it("sorts rows by label", () => {
    const rows = buildAllocationPeriodChangeRows(start, end, chartPoints, schemeCode);
    const sorted = sortAllocationPeriodChangeRows(rows, "label", "asc");
    expect(sorted.map((item) => item.label)).toEqual(["海外", "国内"]);
  });

  it("fills null ratios in series and skips rows with both ratios null", () => {
    const sparseStart = makePoint("2026-05-31", schemeCode, [
      {
        valueCode: "domestic",
        valueName: "国内",
        marketValueMinor: 2_000_000,
        ratio: 0.6,
      },
    ]);
    const sparseEnd = makePoint("2026-06-07", schemeCode, [
      {
        valueCode: "foreign",
        valueName: "海外",
        marketValueMinor: 1_341_347,
        ratio: 0.39,
      },
    ]);
    const sparseMiddle = makePoint("2026-06-03", schemeCode, [
      {
        valueCode: "cash",
        valueName: "現金",
        marketValueMinor: 100_000,
        ratio: 0.01,
      },
    ]);
    const sparseChart = [sparseStart, sparseMiddle, sparseEnd];

    const series = buildAllocationRatioSeries(sparseChart, schemeCode);
    const cash = series.find((item) => item.key === "cash");
    expect(cash?.values).toEqual([null, 0.01, null]);

    const rows = buildAllocationPeriodChangeRows(
      sparseStart,
      sparseEnd,
      sparseChart,
      schemeCode,
    );
    expect(rows.map((row) => row.key).sort()).toEqual(["domestic", "foreign"]);
    expect(rows.find((row) => row.key === "domestic")?.endRatio).toBe(0);
  });

  it("sorts rows by each numeric column in both directions", () => {
    const rows: AllocationPeriodChangeRow[] = [
      {
        key: "a",
        label: "B",
        startRatio: 0.2,
        endRatio: 0.3,
        deltaRatio: 0.1,
        relativeRate: 0.5,
        startMarketValueMinor: 200,
        endMarketValueMinor: 300,
        deltaMarketValueMinor: 100,
        ratioSeries: [0.2, 0.3],
      },
      {
        key: "b",
        label: "A",
        startRatio: 0.5,
        endRatio: 0.4,
        deltaRatio: -0.1,
        relativeRate: -0.2,
        startMarketValueMinor: 500,
        endMarketValueMinor: 400,
        deltaMarketValueMinor: -100,
        ratioSeries: [0.5, 0.4],
      },
    ];

    expect(sortAllocationPeriodChangeRows(rows, "startRatio", "asc")[0].key).toBe("a");
    expect(sortAllocationPeriodChangeRows(rows, "endRatio", "desc")[0].key).toBe("b");
    expect(sortAllocationPeriodChangeRows(rows, "deltaRatio", "asc", false)[0].key).toBe("b");
    expect(sortAllocationPeriodChangeRows(rows, "startMarketValueMinor", "desc")[0].key).toBe(
      "b",
    );
    expect(sortAllocationPeriodChangeRows(rows, "endMarketValueMinor", "asc")[0].key).toBe("a");
    expect(sortAllocationPeriodChangeRows(rows, "deltaMarketValueMinor", "desc")[0].key).toBe(
      "a",
    );
    expect(sortAllocationPeriodChangeRows(rows, "deltaRatio", "asc", true)[0].key).toBe("a");
    expect(
      sortAllocationPeriodChangeRows(
        rows,
        "unknown" as AllocationPeriodChangeSortColumn,
        "asc",
      ),
    ).toHaveLength(2);
  });

  it("skips rows when both start and end ratios are null", () => {
    const nullRatioStart = makePoint("2026-05-31", schemeCode, [
      {
        valueCode: "ghost",
        valueName: "ゴースト",
        marketValueMinor: 0,
        ratio: null as unknown as number,
      },
    ]);
    const nullRatioEnd = makePoint("2026-06-07", schemeCode, [
      {
        valueCode: "ghost",
        valueName: "ゴースト",
        marketValueMinor: 0,
        ratio: null as unknown as number,
      },
    ]);
    const rows = buildAllocationPeriodChangeRows(
      nullRatioStart,
      nullRatioEnd,
      [nullRatioStart, nullRatioEnd],
      schemeCode,
    );
    expect(rows).toEqual([]);
  });

  it("resolves slice values and ratio labels from chart data", () => {
    const { resolveSliceValue } = __allocationPeriodChangeTesting;
    expect(resolveSliceValue(start, schemeCode, "missing")).toEqual({
      ratio: null,
      marketValueMinor: null,
    });
    expect(resolveSliceValue(makePoint("2026-06-01", schemeCode, []), schemeCode, "domestic")).toEqual({
      ratio: null,
      marketValueMinor: null,
    });
    expect(resolveSliceValue(start, "missing_scheme", "domestic")).toEqual({
      ratio: null,
      marketValueMinor: null,
    });
    expect(resolveSliceValue(start, schemeCode, "domestic")).toEqual({
      ratio: 0.6,
      marketValueMinor: 2_000_000,
    });
    const series = buildAllocationRatioSeries(chartPoints, schemeCode);
    expect(series.find((item) => item.key === "domestic")?.label).toBe("国内");
    expect(series.find((item) => item.key === "domestic")?.values).toEqual([
      0.6, 0.62, 0.61,
    ]);
    const unnamedPoint = makePoint("2026-06-01", schemeCode, [
      {
        valueCode: "cash",
        valueName: undefined as unknown as string,
        marketValueMinor: 100_000,
        ratio: 0.1,
      },
    ]);
    const unnamedSeries = buildAllocationRatioSeries([unnamedPoint], schemeCode);
    expect(unnamedSeries[0]?.label).toBe("cash");
    const firstOnly = makePoint("2026-06-01", schemeCode, [
      {
        valueCode: "domestic",
        valueName: "国内",
        marketValueMinor: 2_000_000,
        ratio: 0.6,
      },
    ]);
    const secondEmpty = makePoint("2026-06-02", schemeCode, []);
    secondEmpty.allocationsByScheme = {};
    const mixedSeries = buildAllocationRatioSeries([firstOnly, secondEmpty], schemeCode);
    expect(mixedSeries[0]?.values).toEqual([0.6, null]);
  });

  it("handles missing scheme codes in chart points", () => {
    expect(buildAllocationRatioSeries(chartPoints, "missing_scheme")).toEqual([]);
    expect(
      buildAllocationPeriodChangeRows(start, end, chartPoints, "missing_scheme"),
    ).toEqual([]);
    const emptySchemePoint = makePoint("2026-06-01", schemeCode, []);
    emptySchemePoint.allocationsByScheme = {};
    expect(buildAllocationRatioSeries([emptySchemePoint], schemeCode)).toEqual([]);
  });

  it("falls back when ratio series is missing a composition", () => {
    const rows = buildAllocationPeriodChangeRows(start, end, [], schemeCode);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.ratioSeries.length === 0)).toBe(true);
  });
});
