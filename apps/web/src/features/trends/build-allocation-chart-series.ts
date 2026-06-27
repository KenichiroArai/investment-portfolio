import {
  comparePortfolioInstrumentOrder,
  PORTFOLIO_INSTRUMENT_SCHEME_CODE,
  type AggregatedTrendPoint,
} from "@repo/shared";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import type { TrendStackedAreaSeries } from "@/features/trends/TrendStackedAreaChart";

export function buildAllocationChartSeries(
  chartPoints: AggregatedTrendPoint[],
  schemeCode: string,
): TrendStackedAreaSeries[] {
  let result: TrendStackedAreaSeries[] = [];

  const valueCodes = new Set<string>();
  for (const point of chartPoints) {
    const slices = point.allocationsByScheme[schemeCode] ?? [];
    for (const slice of slices) {
      valueCodes.add(slice.valueCode);
    }
  }

  const orderedValueCodes =
    schemeCode === PORTFOLIO_INSTRUMENT_SCHEME_CODE
      ? [...valueCodes].sort((left, right) => {
          const leftSlice = chartPoints
            .flatMap((point) => point.allocationsByScheme[schemeCode] ?? [])
            .find((slice) => slice.valueCode === left);
          const rightSlice = chartPoints
            .flatMap((point) => point.allocationsByScheme[schemeCode] ?? [])
            .find((slice) => slice.valueCode === right);
          let cmp = comparePortfolioInstrumentOrder(
            {
              sortOrder: leftSlice?.sortOrder ?? null,
              instrumentName: leftSlice?.valueName ?? left,
              instrumentId: left,
            },
            {
              sortOrder: rightSlice?.sortOrder ?? null,
              instrumentName: rightSlice?.valueName ?? right,
              instrumentId: right,
            },
          );
          return cmp;
        })
      : [...valueCodes];

  result = orderedValueCodes.map((valueCode, index) => {
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

  return result;
}
