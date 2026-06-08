"use client";

import type { ReactNode } from "react";

import { TrendLineChart } from "@/features/trends/TrendLineChart";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

export function OverviewTrendChart() {
  const { trends, loadingTrends } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingTrends) {
    result = <p className="trend-chart__loading">推移を読み込み中…</p>;
    return result;
  }

  if (!trends || trends.points.length === 0) {
    result = (
      <p className="trend-chart__empty">
        選択した期間に推移データがありません。期間を広げてください。
      </p>
    );
    return result;
  }

  const labels = trends.points.map((point) => formatAsOfDateJa(point.asOfDate));

  result = (
    <section className="overview-trend">
      <h2>資産推移</h2>
      <TrendLineChart
        className="overview-trend__chart"
        height={160}
        labels={labels}
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: trends.points.map((point) => point.totalMarketValueMinor),
            formatValue: (value) => formatYen(value),
          },
          {
            key: "gain",
            label: "評価損益",
            color: "#16a34a",
            values: trends.points.map((point) => point.unrealizedGainMinor),
            formatValue: (value) => formatYen(value),
          },
        ]}
      />
    </section>
  );
  return result;
}
