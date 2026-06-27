"use client";

import {
  buildAllocationPeriodChangeRows,
  buildTrendPeriodMetricDeltas,
  findLargestAllocationShareChange,
  formatTrendSparseDataNote,
  PORTFOLIO_INSTRUMENT_SCHEME_CODE,
} from "@repo/shared";
import { useMemo } from "react";

import { buildTrendChartBuckets } from "@/features/trends/trend-chart-buckets";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { formatAsOfDateJa, formatMarketValueBaselineSummary } from "@/lib/format-yen";

import { resolvePeriodEndpoints } from "./trends-detail-utils";

type TrendsPanelMode = "portfolio" | "allocation" | "all";

type UseTrendPeriodSummaryDataOptions = {
  mode?: TrendsPanelMode;
  schemeCode?: string;
};

export function useTrendPeriodSummaryData({
  mode = "all",
  schemeCode = "",
}: UseTrendPeriodSummaryDataOptions = {}) {
  const {
    displayTrendPoints,
    baselinePoint,
    trendDisplayUnit,
    trends,
  } = usePortfolioTime();

  let result = useMemo(() => {
    let summaryResult: {
      startDateLabel: string;
      endDateLabel: string;
      startMarketValueMinor: number;
      endMarketValueMinor: number;
      metricDeltas: ReturnType<typeof buildTrendPeriodMetricDeltas>;
      largestShareChange: ReturnType<typeof findLargestAllocationShareChange>;
      sparseDataNote: string | null;
      singleBucketNote: string | null;
      baselineSummary: string | null;
    } | null = null;

    if (displayTrendPoints.length === 0) {
      return summaryResult;
    }

    const chartBuckets = buildTrendChartBuckets({
      displayPoints: displayTrendPoints,
      baselinePoint,
      trendDisplayUnit,
      formatBaselineSummary: (baseline, current) => {
        let summary: string | null = null;
        const delta = current.totalMarketValueMinor - baseline.totalMarketValueMinor;
        if (Number.isFinite(delta)) {
          summary = formatMarketValueBaselineSummary(baseline.sourceAsOfDate, delta);
        }
        return summary;
      },
    });

    const {
      chartPoints,
      singleBucketNote,
      baselineSummary,
    } = chartBuckets;

    const sparseDataNote = (() => {
      let note: string | null = null;
      if (!trends) {
        return note;
      }
      const inRangePoints = trends.points.filter(
        (point) => point.asOfDate >= trends.from && point.asOfDate <= trends.to,
      );
      note = formatTrendSparseDataNote(trends.from, inRangePoints);
      return note;
    })();

    const periodEndpoints = resolvePeriodEndpoints(displayTrendPoints, baselinePoint);

    const activeSchemeCodeForSummary =
      mode === "portfolio" ? PORTFOLIO_INSTRUMENT_SCHEME_CODE : schemeCode;

    const periodChangeRows =
      periodEndpoints && activeSchemeCodeForSummary !== ""
        ? buildAllocationPeriodChangeRows(
            periodEndpoints.start,
            periodEndpoints.end,
            chartPoints,
            activeSchemeCodeForSummary,
          )
        : [];

    const largestShareChange = findLargestAllocationShareChange(
      periodChangeRows.map((row) => ({
        key: row.key,
        label: row.label,
        startRatio: row.startRatio,
        endRatio: row.endRatio,
        deltaRatio: row.deltaRatio,
      })),
    );

    const startMarketValue =
      periodEndpoints?.start.totalMarketValueMinor ??
      displayTrendPoints[0].totalMarketValueMinor;
    const endMarketValue =
      periodEndpoints?.end.totalMarketValueMinor ??
      displayTrendPoints[displayTrendPoints.length - 1].totalMarketValueMinor;
    const startDateLabel = formatAsOfDateJa(
      periodEndpoints?.start.sourceAsOfDate ?? displayTrendPoints[0].sourceAsOfDate,
    );
    const endDateLabel = formatAsOfDateJa(
      periodEndpoints?.end.sourceAsOfDate ??
        displayTrendPoints[displayTrendPoints.length - 1].sourceAsOfDate,
    );

    const metricDeltas =
      periodEndpoints !== null
        ? buildTrendPeriodMetricDeltas(periodEndpoints.start, periodEndpoints.end)
        : [];

    summaryResult = {
      startDateLabel,
      endDateLabel,
      startMarketValueMinor: startMarketValue,
      endMarketValueMinor: endMarketValue,
      metricDeltas,
      largestShareChange,
      sparseDataNote,
      singleBucketNote,
      baselineSummary,
    };

    return summaryResult;
  }, [
    baselinePoint,
    displayTrendPoints,
    mode,
    schemeCode,
    trendDisplayUnit,
    trends,
  ]);

  return result;
}
