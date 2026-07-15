import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
} from "./portfolio-snapshot-metrics";
import type { SnapshotTrendPointDto } from "./snapshot-trends";

/**
 * 複数口座の推移ポイントを基準日で合算する。
 * ある口座にその日の点が無い場合は、直前の評価額を持ち越して加算する。
 */
export function mergeSnapshotTrendPoints(
  pointSeries: SnapshotTrendPointDto[][],
): SnapshotTrendPointDto[] {
  let result: SnapshotTrendPointDto[] = [];

  const sortedSeries = pointSeries
    .map((points) =>
      [...points].sort((left, right) => left.asOfDate.localeCompare(right.asOfDate)),
    )
    .filter((points) => points.length > 0);

  if (sortedSeries.length === 0) {
    return result;
  }

  const dateSet = new Set<string>();
  for (const points of sortedSeries) {
    for (const point of points) {
      dateSet.add(point.asOfDate);
    }
  }
  const dates = [...dateSet].sort((left, right) => left.localeCompare(right));
  const cursors = sortedSeries.map(() => -1);

  for (const date of dates) {
    let totalMarketValueMinor = 0;
    let totalBookValueMinor = 0;
    let contributionsSum = 0;
    let activeCount = 0;
    let contributionsComplete = true;

    for (let seriesIndex = 0; seriesIndex < sortedSeries.length; seriesIndex += 1) {
      const points = sortedSeries[seriesIndex];
      while (
        cursors[seriesIndex] + 1 < points.length &&
        points[cursors[seriesIndex] + 1].asOfDate <= date
      ) {
        cursors[seriesIndex] += 1;
      }

      if (cursors[seriesIndex] < 0) {
        continue;
      }

      const point = points[cursors[seriesIndex]];
      activeCount += 1;
      totalMarketValueMinor += point.totalMarketValueMinor;
      totalBookValueMinor += point.totalBookValueMinor;

      if (point.totalContributionsMinor === null) {
        contributionsComplete = false;
        continue;
      }

      contributionsSum += point.totalContributionsMinor;
    }

    const unrealizedGainMinor = totalMarketValueMinor - totalBookValueMinor;
    const totalContributionsMinor = contributionsComplete ? contributionsSum : null;
    const gainRateOnContributions =
      totalContributionsMinor === null
        ? null
        : computeSnapshotGainRate(
            computeSnapshotPortfolioGainMinor(
              totalMarketValueMinor,
              totalContributionsMinor,
            ),
            totalContributionsMinor,
          );

    result.push({
      asOfDate: date,
      totalMarketValueMinor,
      totalBookValueMinor,
      unrealizedGainMinor,
      gainRateOnBook: computeSnapshotGainRate(
        unrealizedGainMinor,
        totalBookValueMinor,
      ),
      totalContributionsMinor,
      gainRateOnContributions,
      allocationsByScheme: {},
    });
  }

  return result;
}
