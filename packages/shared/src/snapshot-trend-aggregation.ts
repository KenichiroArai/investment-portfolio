import type { SnapshotTrendPointDto } from "./snapshot-trends";

export type TrendDisplayUnit = "day" | "week" | "1m" | "3m" | "6m" | "12m";

export const TREND_DISPLAY_UNITS: TrendDisplayUnit[] = [
  "day",
  "week",
  "1m",
  "3m",
  "6m",
  "12m",
];

export type AggregatedTrendPoint = SnapshotTrendPointDto & {
  bucketKey: string;
  bucketLabel: string;
  sourceAsOfDate: string;
};

export type TrendDisplayPointsResult = {
  displayPoints: AggregatedTrendPoint[];
  baselinePoint: AggregatedTrendPoint | null;
};

export const TREND_DISPLAY_UNIT_LABELS: Record<TrendDisplayUnit, string> = {
  day: "1日単位",
  week: "1週間単位",
  "1m": "1か月単位",
  "3m": "3か月単位",
  "6m": "6か月単位",
  "12m": "12か月単位",
};

const MONTH_UNIT_MONTHS: Record<Exclude<TrendDisplayUnit, "day" | "week">, number> = {
  "1m": 1,
  "3m": 3,
  "6m": 6,
  "12m": 12,
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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

function formatIsoDate(date: Date): string {
  let result = "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  result = `${year}-${month}-${day}`;
  return result;
}

function addDays(date: Date, days: number): Date {
  let result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  let result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function daysBetween(from: string, to: string): number | null {
  let result: number | null = null;
  const fromDate = parseIsoDate(from);
  const toDate = parseIsoDate(to);
  if (!fromDate || !toDate) {
    return result;
  }
  const delta = toDate.getTime() - fromDate.getTime();
  if (delta < 0) {
    return result;
  }
  result = Math.floor(delta / MILLISECONDS_PER_DAY);
  return result;
}

function minIsoDate(left: string, right: string): string {
  let result = left;
  if (right < left) {
    result = right;
  }
  return result;
}

export function readTrendDisplayUnit(value: string | null): TrendDisplayUnit {
  let result: TrendDisplayUnit = "day";
  if (value && TREND_DISPLAY_UNITS.includes(value as TrendDisplayUnit)) {
    result = value as TrendDisplayUnit;
  }
  return result;
}

export function formatTrendBucketLabel(bucketKey: string, unit: TrendDisplayUnit): string {
  let result = bucketKey;

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bucketKey);
  if (dayMatch) {
    result = `${Number(dayMatch[1])}/${Number(dayMatch[2])}/${Number(dayMatch[3])}`;
    return result;
  }

  if (unit !== "day" && unit !== "week") {
    return result;
  }

  return result;
}

function resolveRollingBucketIndex(
  asOfDate: string,
  unit: TrendDisplayUnit,
  rangeFrom: string,
): number | null {
  let result: number | null = null;

  if (unit === "day") {
    return result;
  }

  const date = parseIsoDate(asOfDate);
  const anchor = parseIsoDate(rangeFrom);
  if (!date || !anchor) {
    return result;
  }

  if (unit === "week") {
    const elapsedDays = daysBetween(rangeFrom, asOfDate);
    if (elapsedDays === null) {
      return result;
    }
    result = Math.floor(elapsedDays / 7);
    return result;
  }

  const monthSpan = MONTH_UNIT_MONTHS[unit];
  let index = 0;
  while (index < 10_000) {
    const bucketStart = addMonths(anchor, index * monthSpan);
    const bucketEnd = addDays(addMonths(anchor, (index + 1) * monthSpan), -1);
    if (date >= bucketStart && date <= bucketEnd) {
      result = index;
      return result;
    }
    if (date < bucketStart) {
      return result;
    }
    index += 1;
  }

  return result;
}

function resolveRollingBucketEndDate(
  bucketIndex: number,
  unit: TrendDisplayUnit,
  rangeFrom: string,
  rangeTo: string,
): string | null {
  let result: string | null = null;
  const anchor = parseIsoDate(rangeFrom);
  if (!anchor) {
    return result;
  }

  if (unit === "week") {
    const bucketEnd = addDays(anchor, bucketIndex * 7 + 6);
    result = minIsoDate(formatIsoDate(bucketEnd), rangeTo);
    return result;
  }

  if (unit === "day") {
    return result;
  }

  const monthSpan = MONTH_UNIT_MONTHS[unit];
  const bucketEnd = addDays(addMonths(anchor, (bucketIndex + 1) * monthSpan), -1);
  result = minIsoDate(formatIsoDate(bucketEnd), rangeTo);
  return result;
}

function resolveRollingBucketKey(
  asOfDate: string,
  unit: TrendDisplayUnit,
  rangeFrom: string,
  rangeTo: string,
): string | null {
  let result: string | null = null;
  const bucketIndex = resolveRollingBucketIndex(asOfDate, unit, rangeFrom);
  if (bucketIndex === null) {
    return result;
  }
  result = resolveRollingBucketEndDate(bucketIndex, unit, rangeFrom, rangeTo);
  return result;
}

export function aggregateTrendPoints(
  points: SnapshotTrendPointDto[],
  unit: TrendDisplayUnit,
  rangeFrom: string,
  rangeTo: string,
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
    const bucketKey = resolveRollingBucketKey(point.asOfDate, unit, rangeFrom, rangeTo);
    if (!bucketKey) {
      continue;
    }
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

  const allAggregated = aggregateTrendPoints(points, unit, rangeFrom, rangeTo);

  result.displayPoints = allAggregated.filter(
    (point) => point.sourceAsOfDate >= rangeFrom && point.sourceAsOfDate <= rangeTo,
  );

  const priorPoints = allAggregated.filter((point) => point.sourceAsOfDate < rangeFrom);
  if (priorPoints.length > 0) {
    result.baselinePoint = priorPoints[priorPoints.length - 1] ?? null;
  }

  return result;
}

export const TREND_DISPLAY_UNIT_SINGLE_BUCKET_NOTES: Record<TrendDisplayUnit, string> = {
  day: "この期間は1日分のデータです",
  week: "この期間は1週間分のデータです",
  "1m": "この期間は1か月分のデータです",
  "3m": "この期間は3か月分のデータです",
  "6m": "この期間は6か月分のデータです",
  "12m": "この期間は12か月分のデータです",
};
