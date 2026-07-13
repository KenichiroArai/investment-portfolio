import {
  aggregateTrendPointsByCalendarMonth,
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolvePeriodBoundsForPreset,
  type AggregatedTrendPoint,
  type SnapshotTrendPointDto,
} from "@repo/shared";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { buildTrendChartBuckets } from "@/features/trends/trend-chart-buckets";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { formatPercent, formatYen } from "@/lib/format-yen";

/** 右カラム内におさまるプロット幅の目安 */
export const PORTFOLIO_COMBO_TREND_TARGET_PLOT_WIDTH = 360;
/** 表示する月次ポイント数（直近1年） */
export const PORTFOLIO_COMBO_TREND_MONTH_LIMIT = 12;
export const PORTFOLIO_COMBO_TREND_CAPTION = "直近1年・期末・万円 / 月 / %";

export type PortfolioTrendSeriesInput = {
  code: string;
  name: string;
  points: SnapshotTrendPointDto[];
};

export type PortfolioMarketValueGainRateComboChart = {
  labels: string[];
  sourceDates: string[];
  sourceDateLabels: string[];
  barSeries: TrendChartSeries[];
  lineSeries: TrendChartSeries[];
};

function resolveTrendPointGainRateOnAssetBalance(point: {
  totalMarketValueMinor: number;
  totalBookValueMinor: number;
  totalContributionsMinor: number | null;
}): number | null {
  let result: number | null = null;
  const costBasis =
    point.totalContributionsMinor ?? point.totalBookValueMinor;
  result = computeSnapshotGainRate(
    computeSnapshotPortfolioGainMinor(point.totalMarketValueMinor, costBasis),
    point.totalMarketValueMinor,
  );
  return result;
}

function formatTrendMonthNumber(bucketKey: string): string {
  let result = bucketKey;
  const match = /^(\d{4})-(\d{2})$/.exec(bucketKey);
  if (!match) {
    return result;
  }
  result = String(Number(match[2]));
  return result;
}

function alignPortfolioMonthValues(
  monthKeys: string[],
  monthlyPoints: AggregatedTrendPoint[],
  mapper: (point: AggregatedTrendPoint) => number | null,
): Array<number | null> {
  let result: Array<number | null> = [];
  const byKey = new Map(
    monthlyPoints.map((point) => [point.bucketKey, point] as const),
  );
  result = monthKeys.map((monthKey) => {
    const point = byKey.get(monthKey);
    if (!point) {
      return null;
    }
    return mapper(point);
  });
  return result;
}

export function buildPortfolioMarketValueGainRateComboChart(
  portfolioTrends: PortfolioTrendSeriesInput[],
  options?: {
    monthLimit?: number;
  },
): PortfolioMarketValueGainRateComboChart | null {
  let result: PortfolioMarketValueGainRateComboChart | null = null;
  const monthLimit = options?.monthLimit ?? PORTFOLIO_COMBO_TREND_MONTH_LIMIT;

  if (portfolioTrends.length === 0) {
    return result;
  }

  const availableDates = portfolioTrends.flatMap((series) =>
    series.points.map((point) => point.asOfDate),
  );
  const bounds = resolvePeriodBoundsForPreset("12m", availableDates);
  if (!bounds) {
    return result;
  }

  const monthKeySet = new Set<string>();
  const monthlyByPortfolio = portfolioTrends.map((series) => {
    const monthlyPoints = aggregateTrendPointsByCalendarMonth(
      series.points,
      bounds.from,
      bounds.to,
      { pick: "last" },
    );
    for (const point of monthlyPoints) {
      monthKeySet.add(point.bucketKey);
    }
    return {
      ...series,
      monthlyPoints,
    };
  });

  const monthKeys = [...monthKeySet]
    .sort((left, right) => left.localeCompare(right))
    .slice(-monthLimit);
  if (monthKeys.length === 0) {
    return result;
  }

  const axisPoints: AggregatedTrendPoint[] = monthKeys.map((monthKey) => {
    let axisPoint: AggregatedTrendPoint = {
      asOfDate: `${monthKey}-01`,
      totalMarketValueMinor: 0,
      totalBookValueMinor: 0,
      unrealizedGainMinor: 0,
      gainRateOnBook: null,
      totalContributionsMinor: null,
      gainRateOnContributions: null,
      allocationsByScheme: {},
      bucketKey: monthKey,
      bucketLabel: formatTrendMonthNumber(monthKey),
      sourceAsOfDate: `${monthKey}-01`,
    };

    for (const series of monthlyByPortfolio) {
      const point = series.monthlyPoints.find(
        (item) => item.bucketKey === monthKey,
      );
      if (!point) {
        continue;
      }
      if (point.sourceAsOfDate > axisPoint.sourceAsOfDate) {
        axisPoint = {
          ...axisPoint,
          asOfDate: point.asOfDate,
          sourceAsOfDate: point.sourceAsOfDate,
        };
      }
    }

    return axisPoint;
  });

  const chartBuckets = buildTrendChartBuckets({
    displayPoints: axisPoints,
    baselinePoint: null,
    trendDisplayUnit: "1m",
  });

  const barSeries: TrendChartSeries[] = [];
  const lineSeries: TrendChartSeries[] = [];

  monthlyByPortfolio.forEach((series, index) => {
    const color = getAllocationChartColor(index);
    const marketValues = alignPortfolioMonthValues(
      monthKeys,
      series.monthlyPoints,
      (point) => point.totalMarketValueMinor,
    );
    const gainRates = alignPortfolioMonthValues(
      monthKeys,
      series.monthlyPoints,
      (point) => resolveTrendPointGainRateOnAssetBalance(point),
    );

    if (marketValues.some((value) => value !== null && Number.isFinite(value))) {
      barSeries.push({
        key: `market-${series.code}`,
        label: series.name,
        color,
        values: marketValues,
        formatValue: (value) => formatYen(value),
      });
    }

    if (gainRates.some((value) => value !== null && Number.isFinite(value))) {
      lineSeries.push({
        key: `gain-${series.code}`,
        label: series.name,
        color,
        values: gainRates,
        formatValue: (value) => formatPercent(value),
      });
    }
  });

  if (barSeries.length === 0 && lineSeries.length === 0) {
    return result;
  }

  result = {
    labels: chartBuckets.chartPoints.map((point) => point.bucketLabel),
    sourceDates: chartBuckets.sourceDates,
    sourceDateLabels: chartBuckets.sourceDateLabels,
    barSeries,
    lineSeries,
  };
  return result;
}
