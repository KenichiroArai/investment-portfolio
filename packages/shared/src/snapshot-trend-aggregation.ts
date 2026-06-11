import type { SnapshotPeriodPreset } from "./snapshot-time-range";
import type { SnapshotTrendPointDto } from "./snapshot-trends";

export type TrendDisplayUnit = "day" | "month";

export type AggregatedTrendPoint = SnapshotTrendPointDto & {
  bucketKey: string;
  bucketLabel: string;
  sourceAsOfDate: string;
};

export type ResolveTrendDisplayUnitParams = {
  preset: SnapshotPeriodPreset;
  calendarMonth?: string | null;
  customFrom?: string | null;
  customTo?: string | null;
};

export type TrendDisplayPointsResult = {
  displayPoints: AggregatedTrendPoint[];
  baselinePoint: AggregatedTrendPoint | null;
};

export const TREND_DISPLAY_UNIT_LABELS: Record<TrendDisplayUnit, string> = {
  day: "日次表示",
  month: "月次表示（各月の最終基準日）",
};

const CUSTOM_RANGE_DAY_THRESHOLD = 31;

function parseIsoDate(value: string): Date | null {
  let result: Date | null = null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return result;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return result;
  }
  result = date;
  return result;
}

function computeCustomRangeSpanDays(from: string, to: string): number | null {
  let result: number | null = null;
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) {
    return result;
  }
  const left = fromDate.getTime();
  const right = toDate.getTime();
  if (left > right) {
    return result;
  }
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  result = Math.floor((right - left) / millisecondsPerDay) + 1;
  return result;
}

export function resolveTrendDisplayUnit(
  params: ResolveTrendDisplayUnitParams,
): TrendDisplayUnit {
  let result: TrendDisplayUnit = "month";

  if (params.preset === "1w") {
    result = "day";
    return result;
  }

  if (params.calendarMonth) {
    result = "day";
    return result;
  }

  if (params.customFrom || params.customTo) {
    const from = params.customFrom ?? params.customTo ?? "";
    const to = params.customTo ?? params.customFrom ?? "";
    const spanDays = computeCustomRangeSpanDays(from, to);
    if (spanDays !== null && spanDays <= CUSTOM_RANGE_DAY_THRESHOLD) {
      result = "day";
      return result;
    }
    return result;
  }

  return result;
}

export function resolveTrendDisplayUnitWithFallback(
  points: SnapshotTrendPointDto[],
  params: ResolveTrendDisplayUnitParams,
): TrendDisplayUnit {
  let result = resolveTrendDisplayUnit(params);

  if (result === "month" && points.length >= 2) {
    const monthlyBuckets = aggregateTrendPoints(points, "month");
    if (monthlyBuckets.length < 2) {
      result = "day";
    }
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

export function buildTrendDisplayPoints(
  points: SnapshotTrendPointDto[],
  unit: TrendDisplayUnit,
  rangeFrom: string,
  rangeTo: string,
): TrendDisplayPointsResult {
  let result: TrendDisplayPointsResult = {
    displayPoints: [],
    baselinePoint: null,
  };

  if (points.length === 0) {
    return result;
  }

  const allAggregated = aggregateTrendPoints(points, unit);

  result.displayPoints = allAggregated.filter(
    (point) => point.sourceAsOfDate >= rangeFrom && point.sourceAsOfDate <= rangeTo,
  );

  const priorPoints = allAggregated.filter((point) => point.sourceAsOfDate < rangeFrom);
  if (priorPoints.length > 0) {
    result.baselinePoint = priorPoints[priorPoints.length - 1] ?? null;
  }

  return result;
}
