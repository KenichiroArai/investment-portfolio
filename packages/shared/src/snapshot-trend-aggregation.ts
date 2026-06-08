import type { SnapshotPeriodPreset } from "./snapshot-time-range";
import type { SnapshotTrendPointDto } from "./snapshot-trends";

export type TrendDisplayUnit = "day" | "month";

export type AggregatedTrendPoint = SnapshotTrendPointDto & {
  bucketKey: string;
  bucketLabel: string;
  sourceAsOfDate: string;
};

export const TREND_DISPLAY_UNIT_LABELS: Record<TrendDisplayUnit, string> = {
  day: "日次表示",
  month: "月次表示（各月の最終基準日）",
};

export function resolveTrendDisplayUnit(
  preset: SnapshotPeriodPreset,
): TrendDisplayUnit {
  let result: TrendDisplayUnit = "month";
  if (preset === "1w") {
    result = "day";
    return result;
  }
  return result;
}

export function formatTrendBucketLabel(bucketKey: string, unit: TrendDisplayUnit): string {
  let result = bucketKey;

  if (unit === "month") {
    const match = /^(\d{4})-(\d{2})$/.exec(bucketKey);
    if (match) {
      result = `${Number(match[1])}年${Number(match[2])}月`;
      return result;
    }
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bucketKey);
  if (dayMatch) {
    result = `${Number(dayMatch[1])}/${Number(dayMatch[2])}/${Number(dayMatch[3])}`;
    return result;
  }

  return result;
}

function resolveBucketKey(asOfDate: string, unit: TrendDisplayUnit): string {
  let result = asOfDate;
  if (unit === "month") {
    const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(asOfDate);
    if (match) {
      result = `${match[1]}-${match[2]}`;
      return result;
    }
  }
  return result;
}

export function aggregateTrendPoints(
  points: SnapshotTrendPointDto[],
  unit: TrendDisplayUnit,
): AggregatedTrendPoint[] {
  let result: AggregatedTrendPoint[] = [];

  if (points.length === 0) {
    return result;
  }

  if (unit === "day") {
    result = [...points]
      .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate))
      .map((point) => {
        let aggregated: AggregatedTrendPoint = {
          ...point,
          bucketKey: point.asOfDate,
          bucketLabel: formatTrendBucketLabel(point.asOfDate, "day"),
          sourceAsOfDate: point.asOfDate,
        };
        return aggregated;
      });
    return result;
  }

  const buckets = new Map<string, SnapshotTrendPointDto>();
  for (const point of points) {
    const bucketKey = resolveBucketKey(point.asOfDate, unit);
    const existing = buckets.get(bucketKey);
    if (!existing || point.asOfDate > existing.asOfDate) {
      buckets.set(bucketKey, point);
    }
  }

  result = [...buckets.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([bucketKey, point]) => {
      let aggregated: AggregatedTrendPoint = {
        ...point,
        bucketKey,
        bucketLabel: formatTrendBucketLabel(bucketKey, unit),
        sourceAsOfDate: point.asOfDate,
      };
      return aggregated;
    });

  return result;
}
