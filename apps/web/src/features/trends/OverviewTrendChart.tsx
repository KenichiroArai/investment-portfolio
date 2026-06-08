"use client";

import { computeTrendPeriodDeltas } from "@repo/shared";
import type { ReactNode } from "react";

import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { formatYen } from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

export function OverviewTrendChart() {
  const { displayTrendPoints, trendDisplayUnitLabel, loadingTrends } =
    usePortfolioTime();

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

  const labels = displayTrendPoints.map((point) => point.bucketLabel);
  const sourceDates = displayTrendPoints.map((point) => point.sourceAsOfDate);
  const hasMultipleBuckets = displayTrendPoints.length >= 2;

  const deltaSeries: TrendChartSeries[] = [
    {
      key: "market-value-delta",
      label: "評価額の変化",
      color: "#2563eb",
      values: computeTrendPeriodDeltas(
        displayTrendPoints.map((point) => point.totalMarketValueMinor),
      ),
      formatValue: (value) => formatYen(value),
    },
    {
      key: "gain-delta",
      label: "評価損益の変化",
      color: "#16a34a",
      values: computeTrendPeriodDeltas(
        displayTrendPoints.map((point) => point.unrealizedGainMinor),
      ),
      formatValue: (value) => formatYen(value),
    },
  ];

  result = (
    <section className="overview-trend">
      {displayTrendPoints.length === 1 ? (
        <p className="trends-detail__single-bucket-note">
          この期間は1か月分のデータです
        </p>
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
            values: displayTrendPoints.map((point) => point.totalMarketValueMinor),
            formatValue: (value) => formatYen(value),
          },
          {
            key: "gain",
            label: "評価損益",
            color: "#16a34a",
            values: displayTrendPoints.map((point) => point.unrealizedGainMinor),
            formatValue: (value) => formatYen(value),
          },
        ]}
      />
      {hasMultipleBuckets ? (
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
