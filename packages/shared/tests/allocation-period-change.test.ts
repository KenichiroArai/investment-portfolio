import { describe, expect, it } from "vitest";

import {
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
});
