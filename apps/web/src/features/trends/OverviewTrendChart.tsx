"use client";

import type { ReactNode } from "react";

import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import {
  buildTrendChartBuckets,
  computeTrendChartDeltas,
  mapTrendChartLevelValues,
} from "@/features/trends/trend-chart-buckets";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  formatMarketValueBaselineSummary,
  formatYen,
} from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

export function OverviewTrendChart() {
  const {
    displayTrendPoints,
    baselinePoint,
    trendDisplayUnit,
    trendDisplayUnitLabel,
    loadingTrends,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingTrends) {
    result = <p className="trend-chart__loading">推移を読み込み中…</p>;
    return result;
  }

  if (displayTrendPoints.length === 0) {
    result = (
      <p className="trend-chart__empty">
        選択した期間に推移データがありません。期間を広げてください。
      </p>
    );
    return result;
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

  const { labels, sourceDates, hasTrendLines, singleBucketNote, baselineSummary } =
    chartBuckets;

  const marketValueLevelValues = mapTrendChartLevelValues(
    chartBuckets.chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.totalMarketValueMinor,
  );

  const gainLevelValues = mapTrendChartLevelValues(
    chartBuckets.chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.unrealizedGainMinor,
  );

  const deltaSeries: TrendChartSeries[] = [
    {
      key: "market-value-delta",
      label: "評価額の変化",
      color: "#2563eb",
      values: computeTrendChartDeltas(
        marketValueLevelValues,
        displayTrendPoints,
        baselinePoint,
        baselinePoint?.totalMarketValueMinor ?? null,
      ),
      formatValue: (value) => formatYen(value),
    },
    {
      key: "gain-delta",
      label: "評価損益の変化",
      color: "#16a34a",
      values: computeTrendChartDeltas(
        gainLevelValues,
        displayTrendPoints,
        baselinePoint,
        baselinePoint?.unrealizedGainMinor ?? null,
      ),
      formatValue: (value) => formatYen(value),
    },
  ];

  result = (
    <section className="overview-trend">
      {singleBucketNote ? (
        <p className="trends-detail__single-bucket-note">{singleBucketNote}</p>
      ) : null}
      {baselineSummary ? (
        <p className="trends-detail__baseline-summary">{baselineSummary}</p>
      ) : null}
      <TrendBarChart
        className="overview-trend__chart"
        title="資産推移"
        caption={trendDisplayUnitLabel}
        valueKind="yen"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        mode="grouped"
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: marketValueLevelValues,
            formatValue: (value) => formatYen(value),
          },
          {
            key: "gain",
            label: "評価損益",
            color: "#16a34a",
            values: gainLevelValues,
            formatValue: (value) => formatYen(value),
          },
        ]}
      />
      {hasTrendLines ? (
        <div className="trends-detail__subsection">
          <TrendLineChart
            className="overview-trend__chart"
            title="前回比の変化"
            caption={trendDisplayUnitLabel}
            valueKind="yen"
            height={180}
            labels={labels}
            sourceDates={sourceDates}
            series={deltaSeries}
          />
        </div>
      ) : null}
    </section>
  );
  return result;
}
