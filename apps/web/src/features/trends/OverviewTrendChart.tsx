"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { buildPortfolioPath } from "@/lib/portfolio-path";

import { TrendLineChart } from "@/features/trends/TrendLineChart";
import {
  buildTrendChartBuckets,
  mapTrendChartLevelValues,
} from "@/features/trends/trend-chart-buckets";
import {
  formatAsOfDateJa,
  formatMarketValueBaselineSummary,
  formatSignedYenDelta,
  formatYen,
} from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

export function OverviewTrendChart() {
  const {
    portfolioCode,
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

  const {
    chartPoints,
    labels,
    sourceDates,
    sourceDateLabels,
    singleBucketNote,
    baselineSummary,
  } = chartBuckets;

  const marketValueLevelValues = mapTrendChartLevelValues(
    chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.totalMarketValueMinor,
  );

  const startValue =
    chartPoints[0]?.totalMarketValueMinor ?? displayTrendPoints[0].totalMarketValueMinor;
  const endValue =
    chartPoints[chartPoints.length - 1]?.totalMarketValueMinor ??
    displayTrendPoints[displayTrendPoints.length - 1].totalMarketValueMinor;
  const periodDelta = endValue - startValue;
  const startLabel = formatAsOfDateJa(
    chartPoints[0]?.sourceAsOfDate ?? displayTrendPoints[0].sourceAsOfDate,
  );
  const endLabel = formatAsOfDateJa(
    chartPoints[chartPoints.length - 1]?.sourceAsOfDate ??
      displayTrendPoints[displayTrendPoints.length - 1].sourceAsOfDate,
  );

  result = (
    <section className="overview-trend">
      <p className="overview-trend__kpi">
        {startLabel} {formatYen(startValue)} → {endLabel} {formatYen(endValue)}
        <span
          className={
            periodDelta >= 0
              ? "overview-trend__delta overview-trend__delta--positive"
              : "overview-trend__delta overview-trend__delta--negative"
          }
        >
          {" "}
          ({formatSignedYenDelta(periodDelta)})
        </span>
      </p>
      {singleBucketNote ? (
        <p className="trends-detail__single-bucket-note">{singleBucketNote}</p>
      ) : null}
      {baselineSummary ? (
        <p className="trends-detail__baseline-summary">{baselineSummary}</p>
      ) : null}
      <TrendLineChart
        className="overview-trend__chart"
        title="評価額"
        caption={trendDisplayUnitLabel}
        valueKind="yen"
        height={150}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: marketValueLevelValues,
            formatValue: (value) => formatYen(value),
          },
        ]}
      />
      <p className="overview-trend__link">
        <Link
          href={`${buildPortfolioPath(portfolioCode, "portfolio-allocation")}?view=trends`}
        >
          推移の詳細を見る →
        </Link>
      </p>
    </section>
  );
  return result;
}
