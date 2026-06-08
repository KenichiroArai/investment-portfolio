"use client";

import type { ReactNode } from "react";

import { TrendBarChart } from "@/features/trends/TrendBarChart";
import {
  formatTrendChartCaption,
  formatYen,
  formatYenManAxis,
} from "@/lib/format-yen";
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

  result = (
    <section className="overview-trend">
      <h2>資産推移</h2>
      <p className="trends-detail__unit-label">
        {formatTrendChartCaption(trendDisplayUnitLabel)}
      </p>
      {displayTrendPoints.length === 1 ? (
        <p className="trends-detail__single-bucket-note">
          この期間は1か月分のデータです
        </p>
      ) : null}
      <TrendBarChart
        className="overview-trend__chart"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        mode="grouped"
        formatYAxis={formatYenManAxis}
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
    </section>
  );
  return result;
}
