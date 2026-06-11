"use client";

import type { AllocationSeriesInput } from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { formatPercent } from "@/lib/format-yen";

type CompositionRatioLineChartProps = {
  labels: string[];
  sourceDates?: string[];
  sourceDateLabels?: string[];
  ratioSeries: AllocationSeriesInput[];
  selectedKeys: string[];
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
  caption,
  height = 220,
  className,
}: CompositionRatioLineChartProps) {
  const chartSeries = useMemo(() => {
    let result: TrendChartSeries[] = [];
    const selected = ratioSeries.filter((item) => selectedKeys.includes(item.key));
    result = selected.map((item, index) => {
      let series: TrendChartSeries = {
        key: item.key,
        label: item.label,
        color: getAllocationChartColor(index),
        values: item.values,
        formatValue: (value) => formatPercent(value),
      };
      return series;
    });
    return result;
  }, [ratioSeries, selectedKeys]);

  let result: ReactNode = null;

  if (chartSeries.length === 0) {
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

  result = (
    <div
      className={
        className ? `composition-ratio-line-chart ${className}` : "composition-ratio-line-chart"
      }
    >
      <TrendLineChart
        title="構成ごとの構成比推移"
        caption={caption}
        valueKind="percent"
        domainMode="fitData"
        height={height}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        series={chartSeries}
      />
    </div>
  );
  return result;
}
