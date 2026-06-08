import {
  resolveTrendYAxisUnit,
  type TrendChartValueKind,
  type TrendYAxisUnit,
} from "@repo/shared";
import { useMemo } from "react";

import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  formatPercentAxis,
  formatYenAxisLabel,
  formatYenMan,
} from "@/lib/format-yen";

export type TrendYAxisConfig = {
  unit: TrendYAxisUnit | null;
  formatTick: (value: number) => string;
};

function createDefaultTickFormatter(unit: TrendYAxisUnit): (value: number) => string {
  let result: (value: number) => string = formatYenAxisLabel;

  if (unit === "yenMan") {
    result = formatYenMan;
    return result;
  }

  if (unit === "percent") {
    result = formatPercentAxis;
    return result;
  }

  return result;
}

export function useTrendYAxis(
  activeSeries: TrendChartSeries[],
  valueKind?: TrendChartValueKind,
  formatYAxis?: (value: number) => string,
): TrendYAxisConfig {
  const config = useMemo(() => {
    let result: TrendYAxisConfig = {
      unit: null,
      formatTick: (value) => String(value),
    };

    if (!valueKind) {
      if (formatYAxis) {
        result.formatTick = formatYAxis;
      }
      return result;
    }

    const values = activeSeries.flatMap((item) => item.values);
    const unit = resolveTrendYAxisUnit(values, valueKind);
    result = {
      unit,
      formatTick: formatYAxis ?? createDefaultTickFormatter(unit),
    };
    return result;
  }, [activeSeries, formatYAxis, valueKind]);

  return config;
}
