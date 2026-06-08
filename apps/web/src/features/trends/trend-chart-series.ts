export type TrendChartSeries = {
  key: string;
  label: string;
  color: string;
  values: Array<number | null>;
  formatValue?: (value: number) => string;
};
