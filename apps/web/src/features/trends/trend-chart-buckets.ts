import { computeTrendPeriodDeltas, type AggregatedTrendPoint } from "@repo/shared";

export type TrendChartBuckets = {
  chartPoints: AggregatedTrendPoint[];
  labels: string[];
  sourceDates: string[];
  hasTrendLines: boolean;
  singleBucketNote: string | null;
  baselineSummary: string | null;
};

type BuildTrendChartBucketsParams = {
  displayPoints: AggregatedTrendPoint[];
  baselinePoint: AggregatedTrendPoint | null;
  trendDisplayUnit: "day" | "month";
  formatBaselineSummary?: (baseline: AggregatedTrendPoint, current: AggregatedTrendPoint) => string | null;
};

export function buildTrendChartBuckets(
  params: BuildTrendChartBucketsParams,
): TrendChartBuckets {
  let result: TrendChartBuckets = {
    chartPoints: [],
    labels: [],
    sourceDates: [],
    hasTrendLines: false,
    singleBucketNote: null,
    baselineSummary: null,
  };

  const { displayPoints, baselinePoint, trendDisplayUnit } = params;

  if (displayPoints.length === 0) {
    return result;
  }

  if (displayPoints.length === 1 && baselinePoint) {
    result.chartPoints = [baselinePoint, displayPoints[0]];
  } else {
    result.chartPoints = displayPoints;
  }

  result.labels = result.chartPoints.map((point) => point.bucketLabel);
  result.sourceDates = result.chartPoints.map((point) => point.sourceAsOfDate);
  result.hasTrendLines = displayPoints.length >= 2 || baselinePoint !== null;

  if (displayPoints.length === 1) {
    result.singleBucketNote =
      trendDisplayUnit === "day"
        ? "この期間は1日分のデータです"
        : "この期間は1か月分のデータです";
    if (baselinePoint && params.formatBaselineSummary) {
      result.baselineSummary = params.formatBaselineSummary(
        baselinePoint,
        displayPoints[0],
      );
    }
  }

  return result;
}

export function mapTrendChartLevelValues(
  chartPoints: AggregatedTrendPoint[],
  displayPoints: AggregatedTrendPoint[],
  baselinePoint: AggregatedTrendPoint | null,
  mapper: (point: AggregatedTrendPoint) => number | null,
): Array<number | null> {
  let result: Array<number | null> = [];

  if (displayPoints.length === 1 && baselinePoint) {
    result = chartPoints.map(mapper);
    return result;
  }

  result = displayPoints.map(mapper);
  return result;
}

export function computeTrendChartDeltas(
  levelValues: Array<number | null>,
  displayPoints: AggregatedTrendPoint[],
  baselinePoint: AggregatedTrendPoint | null,
  baselineValue: number | null,
): Array<number | null> {
  let result: Array<number | null> = [];

  if (displayPoints.length === 1 && baselinePoint) {
    result = computeTrendPeriodDeltas(levelValues);
    return result;
  }

  result = computeTrendPeriodDeltas(levelValues, { baseline: baselineValue });
  return result;
}
