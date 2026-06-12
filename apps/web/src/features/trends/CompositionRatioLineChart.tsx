"use client";

import type { AllocationSeriesInput } from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import {
  buildAllocationRatioDeltaSeries,
  buildAllocationRatioLevelSeries,
  buildAllocationRatioRelativeSeries,
} from "@/features/trends/build-allocation-ratio-chart-series";
import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import { formatTrendChartMeta } from "@/lib/format-yen";

type CompositionChartView = "level" | "delta" | "relative-rate";

type CompositionRatioLineChartProps = {
  labels: string[];
  sourceDates?: string[];
  sourceDateLabels?: string[];
  ratioSeries: AllocationSeriesInput[];
  selectedKeys: string[];
  view?: CompositionChartView;
  caption?: string;
  height?: number;
  className?: string;
};

export function CompositionRatioLineChart({
  labels,
  sourceDates,
  sourceDateLabels,
  ratioSeries,
  selectedKeys,
  view = "level",
  caption,
  height = 220,
  className,
}: CompositionRatioLineChartProps) {
  const levelSeries = useMemo(() => {
    let result = buildAllocationRatioLevelSeries(ratioSeries, selectedKeys);
    return result;
  }, [ratioSeries, selectedKeys]);

  const deltaSeries = useMemo(() => {
    let result = buildAllocationRatioDeltaSeries(ratioSeries, selectedKeys);
    return result;
  }, [ratioSeries, selectedKeys]);

  const relativeSeries = useMemo(() => {
    let result = buildAllocationRatioRelativeSeries(ratioSeries, selectedKeys);
    return result;
  }, [ratioSeries, selectedKeys]);

  const activeSeries =
    view === "delta" ? deltaSeries : view === "relative-rate" ? relativeSeries : levelSeries;

  let result: ReactNode = null;

  if (activeSeries.length === 0) {
    result = (
      <div
        className={
          className
            ? `composition-ratio-line-chart composition-ratio-line-chart--empty ${className}`
            : "composition-ratio-line-chart composition-ratio-line-chart--empty"
        }
      >
        <p className="trend-chart__empty">
          凡例または表の行をクリックして、表示する構成を選んでください。
        </p>
      </div>
    );
    return result;
  }

  const chartTitle =
    view === "delta"
      ? "構成ごとの構成比増減"
      : view === "relative-rate"
        ? "構成ごとの構成比変化率"
        : "構成ごとの構成比推移";

  const chartCaption =
    view === "delta"
      ? formatTrendChartMeta(caption ?? "", "percentPoint")
      : view === "relative-rate"
        ? formatTrendChartMeta(caption ?? "", "percent")
        : caption;

  result = (
    <div
      className={
        className ? `composition-ratio-line-chart ${className}` : "composition-ratio-line-chart"
      }
    >
      {view === "level" ? (
        <TrendLineChart
          title={chartTitle}
          caption={chartCaption}
          valueKind="percent"
          domainMode="fitData"
          height={height}
          labels={labels}
          sourceDates={sourceDates}
          sourceDateLabels={sourceDateLabels}
          series={activeSeries}
        />
      ) : (
        <TrendBarChart
          title={chartTitle}
          caption={chartCaption}
          valueKind={view === "delta" ? "percentPoint" : "percent"}
          height={height}
          labels={labels}
          sourceDates={sourceDates}
          sourceDateLabels={sourceDateLabels}
          mode="grouped"
          series={activeSeries}
        />
      )}
    </div>
  );
  return result;
}
