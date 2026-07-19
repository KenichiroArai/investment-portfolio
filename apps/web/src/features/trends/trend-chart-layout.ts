import {
  resolveTrendChartFitSlotWidth,
  resolveTrendChartSlotWidth,
  resolveVisibleTrendXLabelIndexes,
} from "@/features/trends/resolve-trend-chart-slot-width";

export type TrendChartLayoutMode = "inline" | "expanded";

export const EXPANDED_TREND_CHART_HEIGHT = 440;
export const EXPANDED_TREND_CHART_NOTE =
  "拡大表示では全期間を画面幅に合わせて表示しています。各点はホバーで確認できます。";

const DEFAULT_MIN_PLOT_WIDTH = 320;

export type TrendChartPlotLayout = {
  pointSlotWidth: number;
  plotWidth: number;
  visibleLabelIndexes: Set<number> | null;
  showPointMarkers: boolean;
};

export function resolveTrendChartPlotLayout(options: {
  labels: string[];
  layoutMode?: TrendChartLayoutMode;
  targetPlotWidth?: number;
  minPlotWidth?: number;
  paddingLeft?: number;
  paddingRight?: number;
}): TrendChartPlotLayout {
  let result: TrendChartPlotLayout = {
    pointSlotWidth: 56,
    plotWidth: DEFAULT_MIN_PLOT_WIDTH,
    visibleLabelIndexes: null,
    showPointMarkers: true,
  };

  const {
    labels,
    layoutMode = "inline",
    targetPlotWidth,
    minPlotWidth = DEFAULT_MIN_PLOT_WIDTH,
    paddingLeft = 0,
    paddingRight = 0,
  } = options;
  const labelCount = labels.length;

  if (labelCount === 0) {
    return result;
  }

  if (layoutMode === "expanded" && targetPlotWidth !== undefined && Number.isFinite(targetPlotWidth)) {
    const availablePlotWidth = Math.max(
      minPlotWidth,
      targetPlotWidth - paddingLeft - paddingRight,
    );
    const pointSlotWidth = resolveTrendChartFitSlotWidth(labelCount, availablePlotWidth);
    const plotWidth = pointSlotWidth * labelCount;
    const visibleIndexes = resolveVisibleTrendXLabelIndexes(labels, pointSlotWidth);

    result = {
      pointSlotWidth,
      plotWidth,
      visibleLabelIndexes: new Set(visibleIndexes),
      showPointMarkers: pointSlotWidth >= 10,
    };
    return result;
  }

  const pointSlotWidth = resolveTrendChartSlotWidth(labels, targetPlotWidth);
  const plotWidth = Math.max(minPlotWidth, pointSlotWidth * labelCount);

  result = {
    pointSlotWidth,
    plotWidth,
    visibleLabelIndexes: null,
    showPointMarkers: true,
  };
  return result;
}
