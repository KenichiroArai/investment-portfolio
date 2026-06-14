export type TrendChartTooltipMode =
  | "percentDelta"
  | "trendDelta"
  | "levelDelta"
  | "relativeRateDelta";

export type TrendChartSeries = {
  key: string;
  label: string;
  color: string;
  values: Array<number | null>;
  levelValues?: Array<number | null>;
  baselineValue?: number | null;
  tooltipMode?: TrendChartTooltipMode;
  tooltipUnit?: "yen" | "percentPoint";
  allocationPercentFormat?: boolean;
  formatValue?: (value: number) => string;
};
