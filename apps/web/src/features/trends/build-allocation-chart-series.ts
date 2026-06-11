import {
  collapseAllocationSeries,
  type AggregatedTrendPoint,
} from "@repo/shared";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import type { TrendStackedAreaSeries } from "@/features/trends/TrendStackedAreaChart";

export function buildAllocationChartSeries(
  chartPoints: AggregatedTrendPoint[],
  schemeCode: string,
  topN: number = 6,
): TrendStackedAreaSeries[] {
  let result: TrendStackedAreaSeries[] = [];

  const valueCodes = new Set<string>();
  for (const point of chartPoints) {
    const slices = point.allocationsByScheme[schemeCode] ?? [];
    for (const slice of slices) {
      valueCodes.add(slice.valueCode);
    }
  }

  const rawSeries = [...valueCodes].map((valueCode, index) => {
    const firstSlice = chartPoints
      .flatMap((point) => point.allocationsByScheme[schemeCode] ?? [])
      .find((slice) => slice.valueCode === valueCode);
    let item: TrendStackedAreaSeries = {
      key: valueCode,
      label: firstSlice?.valueName ?? valueCode,
      color: getAllocationChartColor(index),
      values: chartPoints.map((point) => {
        const slice = (point.allocationsByScheme[schemeCode] ?? []).find(
          (allocation) => allocation.valueCode === valueCode,
        );
        return slice ? slice.ratio : null;
      }),
    };
    return item;
  });

  const collapsed = collapseAllocationSeries(rawSeries, topN);
  result = collapsed.map((item, index) => {
    let mapped: TrendStackedAreaSeries = {
      ...item,
      color: getAllocationChartColor(index),
      otherMembers: item.otherMembers,
    };
    return mapped;
  });

  return result;
}
