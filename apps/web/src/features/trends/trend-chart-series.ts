export type TrendChartSeries = {
  key: string;
  label: string;
  color: string;
  values: Array<number | null>;
  levelValues?: Array<number | null>;
  tooltipMode?: "percentDelta";
  formatValue?: (value: number) => string;
};
