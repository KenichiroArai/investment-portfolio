import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  formatAllocationPercentDeltaTooltip,
  formatAllocationPercentLevelDeltaTooltip,
  formatAllocationPercentPoint,
  formatPercentDeltaTooltip,
  formatPercentLevelDeltaTooltip,
  formatPercentPoint,
  formatRelativeRateBarTooltip,
  formatSignedYenDelta,
  formatYenLevelDeltaTooltip,
  formatYenTrendDeltaTooltip,
  resolveTrendTooltipPrevious,
} from "@/lib/format-yen";

export function formatTrendChartTooltipValue(
  item: TrendChartSeries,
  hoveredIndex: number,
): string | null {
  let result: string | null = null;

  const value = item.values[hoveredIndex];
  if (value === null || !Number.isFinite(value)) {
    return result;
  }

  const levelValues = item.levelValues ?? item.values;
  const current = levelValues[hoveredIndex];
  const previous = resolveTrendTooltipPrevious(
    levelValues,
    hoveredIndex,
    item.baselineValue,
  );

  if (item.tooltipMode === "trendDelta") {
    result = formatYenTrendDeltaTooltip(previous, current);
    return result;
  }

  if (item.tooltipMode === "percentDelta") {
    result = item.allocationPercentFormat
      ? formatAllocationPercentDeltaTooltip(previous, current)
      : formatPercentDeltaTooltip(previous, current);
    return result;
  }

  if (item.tooltipMode === "levelDelta") {
    if (item.tooltipUnit === "percentPoint") {
      result = item.allocationPercentFormat
        ? formatAllocationPercentLevelDeltaTooltip(previous, current)
        : formatPercentLevelDeltaTooltip(previous, current);
      return result;
    }

    result = formatYenLevelDeltaTooltip(previous, current);
    return result;
  }

  if (item.tooltipMode === "relativeRateDelta") {
    if (item.tooltipUnit === "percentPoint") {
      result = formatRelativeRateBarTooltip(
        previous,
        current,
        value,
        item.allocationPercentFormat
          ? (absoluteDelta) => formatAllocationPercentPoint(absoluteDelta)
          : (absoluteDelta) => formatPercentPoint(absoluteDelta),
      );
      return result;
    }

    result = formatRelativeRateBarTooltip(
      previous,
      current,
      value,
      formatSignedYenDelta,
    );
    return result;
  }

  result = item.formatValue ? item.formatValue(value) : String(value);
  return result;
}
