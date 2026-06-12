import {
  computeTrendPeriodDeltas,
  computeTrendPeriodRelativeDeltas,
  type AllocationSeriesInput,
} from "@repo/shared";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  formatPercent,
  formatPercentPoint,
  formatPercentRelativeChange,
} from "@/lib/format-yen";

function buildSelectedRatioSeries(
  ratioSeries: AllocationSeriesInput[],
  selectedKeys: string[],
): AllocationSeriesInput[] {
  let result = ratioSeries.filter((item) => selectedKeys.includes(item.key));
  return result;
}

export function buildAllocationRatioLevelSeries(
  ratioSeries: AllocationSeriesInput[],
  selectedKeys: string[],
): TrendChartSeries[] {
  let result: TrendChartSeries[] = [];
  const selected = buildSelectedRatioSeries(ratioSeries, selectedKeys);

  result = selected.map((item, index) => {
    const colorIndex = ratioSeries.findIndex((series) => series.key === item.key);
    let series: TrendChartSeries = {
      key: item.key,
      label: item.label,
      color: getAllocationChartColor(colorIndex >= 0 ? colorIndex : index),
      values: item.values,
      levelValues: item.values,
      tooltipMode: "levelDelta",
      tooltipUnit: "percentPoint",
      formatValue: (value) => formatPercent(value),
    };
    return series;
  });

  return result;
}

export function buildAllocationRatioDeltaSeries(
  ratioSeries: AllocationSeriesInput[],
  selectedKeys: string[],
): TrendChartSeries[] {
  let result: TrendChartSeries[] = [];
  const selected = buildSelectedRatioSeries(ratioSeries, selectedKeys);

  result = selected.map((item, index) => {
    const colorIndex = ratioSeries.findIndex((series) => series.key === item.key);
    let series: TrendChartSeries = {
      key: `${item.key}-delta`,
      label: item.label,
      color: getAllocationChartColor(colorIndex >= 0 ? colorIndex : index),
      values: computeTrendPeriodDeltas(item.values),
      levelValues: item.values,
      tooltipMode: "percentDelta",
      formatValue: (value) => formatPercentPoint(value),
    };
    return series;
  });

  return result;
}

export function buildAllocationRatioRelativeSeries(
  ratioSeries: AllocationSeriesInput[],
  selectedKeys: string[],
): TrendChartSeries[] {
  let result: TrendChartSeries[] = [];
  const selected = buildSelectedRatioSeries(ratioSeries, selectedKeys);

  result = selected.map((item, index) => {
    const colorIndex = ratioSeries.findIndex((series) => series.key === item.key);
    let series: TrendChartSeries = {
      key: `${item.key}-relative`,
      label: item.label,
      color: getAllocationChartColor(colorIndex >= 0 ? colorIndex : index),
      values: computeTrendPeriodRelativeDeltas(item.values),
      levelValues: item.values,
      tooltipMode: "relativeRateDelta",
      tooltipUnit: "percentPoint",
      formatValue: (value) => formatPercentRelativeChange(value),
    };
    return series;
  });

  return result;
}
