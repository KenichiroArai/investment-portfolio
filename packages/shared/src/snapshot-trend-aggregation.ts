import type {
  SnapshotTrendAllocationSlice,
  SnapshotTrendPointDto,
} from "./snapshot-trends";

export type TrendDisplayUnit = "day" | "week" | "1m" | "3m" | "6m" | "12m";

export const TREND_DISPLAY_UNITS: TrendDisplayUnit[] = [
  "day",
  "week",
  "1m",
  "3m",
  "6m",
  "12m",
];

export type TrendBucketPick = "first" | "last" | "min" | "max" | "average";

export const TREND_BUCKET_PICKS: TrendBucketPick[] = [
  "first",
  "last",
  "min",
  "max",
  "average",
];

export type TrendMinMaxField =
  | "marketValue"
  | "bookValue"
  | "unrealizedGain"
  | "gainRateOnBook"
  | "contributions"
  | "gainRateOnContributions";

export const TREND_MIN_MAX_FIELDS: TrendMinMaxField[] = [
  "marketValue",
  "bookValue",
  "unrealizedGain",
  "gainRateOnBook",
  "contributions",
  "gainRateOnContributions",
];

export const TREND_BUCKET_PICK_LABELS: Record<TrendBucketPick, string> = {
  first: "期初",
  last: "期末",
  min: "最小",
  max: "最大",
  average: "平均",
};

export const TREND_MIN_MAX_FIELD_LABELS: Record<TrendMinMaxField, string> = {
  marketValue: "総時価",
  bookValue: "簿価",
  unrealizedGain: "評価損益",
  gainRateOnBook: "簿価比利益率",
  contributions: "拠出額",
  gainRateOnContributions: "拠出比利益率",
};

export type TrendAggregationOptions = {
  pick?: TrendBucketPick;
  minMaxField?: TrendMinMaxField;
};

export type AggregatedTrendPoint = SnapshotTrendPointDto & {
  bucketKey: string;
  bucketLabel: string;
  sourceAsOfDate: string;
  isAveraged?: boolean;
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

function formatIsoDateJaShort(isoDate: string): string {
  let result = isoDate;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return result;
  }
  result = `${Number(match[1])}/${Number(match[2])}/${Number(match[3])}`;
  return result;
}

export function readTrendDisplayUnit(value: string | null): TrendDisplayUnit {
  let result: TrendDisplayUnit = "day";
  if (value && TREND_DISPLAY_UNITS.includes(value as TrendDisplayUnit)) {
    result = value as TrendDisplayUnit;
  }
  return result;
}

export function readTrendBucketPick(value: string | null): TrendBucketPick {
  let result: TrendBucketPick = "last";
  if (value && TREND_BUCKET_PICKS.includes(value as TrendBucketPick)) {
    result = value as TrendBucketPick;
  }
  return result;
}

export function readTrendMinMaxField(value: string | null): TrendMinMaxField {
  let result: TrendMinMaxField = "marketValue";
  if (value && TREND_MIN_MAX_FIELDS.includes(value as TrendMinMaxField)) {
    result = value as TrendMinMaxField;
  }
  return result;
}

export function formatTrendBucketLabel(
  bucketKey: string,
  unit: TrendDisplayUnit,
  bucketStart?: string,
): string {
  let result = bucketKey;

  if (unit === "day" || unit === "week") {
    result = formatIsoDateJaShort(bucketKey);
    return result;
  }

  if (bucketStart && bucketStart !== bucketKey) {
    const startLabel = formatIsoDateJaShort(bucketStart);
    const endLabel = formatIsoDateJaShort(bucketKey);
    const startMatch = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(startLabel);
    const endMatch = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(endLabel);
    if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
      result = `${startLabel}～${endMatch[2]}/${endMatch[3]}`;
      return result;
    }
    result = `${startLabel}～${endLabel}`;
    return result;
  }

  result = formatIsoDateJaShort(bucketKey);
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
  while (true) {
    let bucketStartDate = anchor;
    if (index !== 0) {
      bucketStartDate = addDays(addMonths(anchor, index * monthSpan), 1);
    }
    const bucketEndDate = addMonths(anchor, (index + 1) * monthSpan);
    if (date >= bucketStartDate && date <= bucketEndDate) {
      result = index;
      return result;
    }
    if (date < bucketStartDate) {
      return result;
    }
    index += 1;
  }
}

function resolveRollingBucketStartDate(
  bucketIndex: number,
  unit: TrendDisplayUnit,
  rangeFrom: string,
): string | null {
  let result: string | null = null;
  const anchor = parseIsoDate(rangeFrom);
  if (!anchor) {
    return result;
  }

  if (unit === "week") {
    const bucketStart = addDays(anchor, bucketIndex * 7);
    result = formatIsoDate(bucketStart);
    return result;
  }

  if (unit === "day") {
    return result;
  }

  if (bucketIndex === 0) {
    result = rangeFrom;
    return result;
  }

  const monthSpan = MONTH_UNIT_MONTHS[unit];
  const bucketStart = addDays(addMonths(anchor, bucketIndex * monthSpan), 1);
  result = formatIsoDate(bucketStart);
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
  const bucketEnd = addMonths(anchor, (bucketIndex + 1) * monthSpan);
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

function averageNullableNumbers(values: Array<number | null>): number | null {
  let result: number | null = null;
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (valid.length === 0) {
    return result;
  }
  result = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  return result;
}

function resolveMinMaxComparableValue(
  point: SnapshotTrendPointDto,
  field: TrendMinMaxField,
): number | null {
  let result: number | null = null;

  if (field === "marketValue") {
    result = Number.isFinite(point.totalMarketValueMinor)
      ? point.totalMarketValueMinor
      : null;
    return result;
  }

  if (field === "bookValue") {
    result = Number.isFinite(point.totalBookValueMinor)
      ? point.totalBookValueMinor
      : null;
    return result;
  }

  if (field === "unrealizedGain") {
    result = Number.isFinite(point.unrealizedGainMinor)
      ? point.unrealizedGainMinor
      : null;
    return result;
  }

  if (field === "gainRateOnBook") {
    result =
      point.gainRateOnBook !== null && Number.isFinite(point.gainRateOnBook)
        ? point.gainRateOnBook
        : null;
    return result;
  }

  if (field === "contributions") {
    result =
      point.totalContributionsMinor !== null &&
      Number.isFinite(point.totalContributionsMinor)
        ? point.totalContributionsMinor
        : null;
    return result;
  }

  result =
    point.gainRateOnContributions !== null &&
    Number.isFinite(point.gainRateOnContributions)
      ? point.gainRateOnContributions
      : null;
  return result;
}

function averageAllocationsByScheme(
  points: SnapshotTrendPointDto[],
): Record<string, SnapshotTrendAllocationSlice[]> {
  let result: Record<string, SnapshotTrendAllocationSlice[]> = {};
  const schemeCodes = new Set<string>();

  for (const point of points) {
    for (const schemeCode of Object.keys(point.allocationsByScheme)) {
      schemeCodes.add(schemeCode);
    }
  }

  for (const schemeCode of schemeCodes) {
    const valueCodes = new Set<string>();
    for (const point of points) {
      for (const slice of point.allocationsByScheme[schemeCode] ?? []) {
        valueCodes.add(slice.valueCode);
      }
    }

    const slices: SnapshotTrendAllocationSlice[] = [];
    for (const valueCode of valueCodes) {
      const ratios: number[] = [];
      const marketValues: number[] = [];
      let valueName = valueCode;
      let sortOrder: number | null | undefined = undefined;

      for (const point of points) {
        const slice = (point.allocationsByScheme[schemeCode] ?? []).find(
          (item) => item.valueCode === valueCode,
        );
        if (!slice) {
          continue;
        }
        valueName = slice.valueName;
        if (sortOrder === undefined && slice.sortOrder !== undefined) {
          sortOrder = slice.sortOrder;
        }
        ratios.push(slice.ratio);
        marketValues.push(slice.marketValueMinor);
      }

      const avgMarketValue =
        marketValues.reduce((sum, value) => sum + value, 0) / marketValues.length;
      const avgRatio = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
      slices.push({
        valueCode,
        valueName,
        marketValueMinor: avgMarketValue,
        ratio: avgRatio,
        sortOrder,
      });
    }

    const ratioSum = slices.reduce((sum, slice) => sum + slice.ratio, 0);
    if (ratioSum > 0) {
      for (const slice of slices) {
        slice.ratio = slice.ratio / ratioSum;
      }
    }

    result[schemeCode] = slices;
  }

  return result;
}

function averageBucketPoints(
  points: SnapshotTrendPointDto[],
  bucketKey: string,
): SnapshotTrendPointDto | null {
  let result: SnapshotTrendPointDto | null = null;

  if (points.length === 0) {
    return result;
  }

  result = {
    asOfDate: bucketKey,
    totalMarketValueMinor: averageNullableNumbers(
      points.map((point) => point.totalMarketValueMinor),
    ) ?? 0,
    totalBookValueMinor: averageNullableNumbers(
      points.map((point) => point.totalBookValueMinor),
    ) ?? 0,
    unrealizedGainMinor: averageNullableNumbers(
      points.map((point) => point.unrealizedGainMinor),
    ) ?? 0,
    gainRateOnBook: averageNullableNumbers(
      points.map((point) => point.gainRateOnBook),
    ),
    totalContributionsMinor: averageNullableNumbers(
      points.map((point) => point.totalContributionsMinor),
    ),
    gainRateOnContributions: averageNullableNumbers(
      points.map((point) => point.gainRateOnContributions),
    ),
    allocationsByScheme: averageAllocationsByScheme(points),
  };
  return result;
}

type ResolvedBucketPoint = {
  point: SnapshotTrendPointDto;
  isAveraged: boolean;
};

function resolveBucketPoint(
  points: SnapshotTrendPointDto[],
  pick: TrendBucketPick,
  minMaxField: TrendMinMaxField,
  bucketKey: string,
): ResolvedBucketPoint | null {
  let result: ResolvedBucketPoint | null = null;

  if (points.length === 0) {
    return result;
  }

  const sorted = [...points].sort((left, right) =>
    left.asOfDate.localeCompare(right.asOfDate),
  );

  if (pick === "first") {
    result = { point: sorted[0], isAveraged: false };
    return result;
  }

  if (pick === "last") {
    result = { point: sorted[sorted.length - 1], isAveraged: false };
    return result;
  }

  if (pick === "average") {
    result = {
      point: averageBucketPoints(sorted, bucketKey)!,
      isAveraged: true,
    };
    return result;
  }

  const preferMin = pick === "min";
  let best: SnapshotTrendPointDto | null = null;
  let bestValue: number | null = null;

  for (const point of sorted) {
    const value = resolveMinMaxComparableValue(point, minMaxField);
    if (value === null) {
      continue;
    }

    if (best === null || bestValue === null) {
      best = point;
      bestValue = value;
      continue;
    }

    const isBetter = preferMin ? value < bestValue : value > bestValue;
    const isTieNewer = value === bestValue && point.asOfDate > best.asOfDate;
    if (isBetter || isTieNewer) {
      best = point;
      bestValue = value;
    }
  }

  if (best) {
    result = { point: best, isAveraged: false };
    return result;
  }

  result = { point: sorted[sorted.length - 1], isAveraged: false };
  return result;
}

function toAggregatedTrendPoint(
  point: SnapshotTrendPointDto,
  bucketKey: string,
  unit: TrendDisplayUnit,
  bucketStart: string | null,
  isAveraged = false,
): AggregatedTrendPoint {
  let result: AggregatedTrendPoint = {
    ...point,
    asOfDate: isAveraged ? bucketKey : point.asOfDate,
    bucketKey,
    bucketLabel: formatTrendBucketLabel(
      bucketKey,
      unit,
      bucketStart ?? undefined,
    ),
    sourceAsOfDate: isAveraged ? bucketKey : point.asOfDate,
    isAveraged: isAveraged || undefined,
  };
  return result;
}

function resolveAggregationOptions(
  options?: TrendAggregationOptions,
): { pick: TrendBucketPick; minMaxField: TrendMinMaxField } {
  let result = {
    pick: options?.pick ?? ("last" as TrendBucketPick),
    minMaxField: options?.minMaxField ?? ("marketValue" as TrendMinMaxField),
  };
  return result;
}

export function aggregateTrendPoints(
  points: SnapshotTrendPointDto[],
  unit: TrendDisplayUnit,
  rangeFrom: string,
  rangeTo: string,
  options?: TrendAggregationOptions,
): AggregatedTrendPoint[] {
  let result: AggregatedTrendPoint[] = [];

  if (points.length === 0) {
    return result;
  }

  const { pick, minMaxField } = resolveAggregationOptions(options);

  if (unit === "day") {
    result = [...points]
      .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate))
      .map((point) => {
        const resolved = resolveBucketPoint([point], pick, minMaxField, point.asOfDate)!;
        let aggregated = toAggregatedTrendPoint(
          resolved.point,
          point.asOfDate,
          "day",
          point.asOfDate,
          resolved.isAveraged,
        );
        return aggregated;
      });
    return result;
  }

  const buckets = new Map<
    string,
    { points: SnapshotTrendPointDto[]; bucketStart: string | null }
  >();
  for (const point of points) {
    const bucketIndex = resolveRollingBucketIndex(point.asOfDate, unit, rangeFrom);
    if (bucketIndex === null) {
      continue;
    }
    const bucketKey = resolveRollingBucketEndDate(
      bucketIndex,
      unit,
      rangeFrom,
      rangeTo,
    )!;
    const bucketStart = resolveRollingBucketStartDate(bucketIndex, unit, rangeFrom);
    const existing = buckets.get(bucketKey);
    if (existing) {
      existing.points.push(point);
    } else {
      buckets.set(bucketKey, { points: [point], bucketStart });
    }
  }

  result = [...buckets.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .flatMap(([bucketKey, entry]) => {
      const resolved = resolveBucketPoint(
        entry.points,
        pick,
        minMaxField,
        bucketKey,
      )!;
      let aggregated = toAggregatedTrendPoint(
        resolved.point,
        bucketKey,
        unit,
        entry.bucketStart,
        resolved.isAveraged,
      );
      return [aggregated];
    });

  return result;
}

function resolveCalendarYearMonth(asOfDate: string): string | null {
  let result: string | null = null;
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(asOfDate);
  if (!match) {
    return result;
  }
  result = `${match[1]}-${match[2]}`;
  return result;
}

function formatCalendarMonthBucketLabel(yearMonth: string): string {
  let result = yearMonth;
  // 呼び出し元は resolveCalendarYearMonth 由来の YYYY-MM 形式のみを渡す
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth)!;
  result = `${Number(match[2])}月`;
  return result;
}

/**
 * 暦月ごとに集約する。既定の pick は期末（その月の最終スナップショット）。
 */
export function aggregateTrendPointsByCalendarMonth(
  points: SnapshotTrendPointDto[],
  rangeFrom: string,
  rangeTo: string,
  options?: TrendAggregationOptions,
): AggregatedTrendPoint[] {
  let result: AggregatedTrendPoint[] = [];

  if (points.length === 0) {
    return result;
  }

  const { pick, minMaxField } = resolveAggregationOptions(options);
  const buckets = new Map<string, SnapshotTrendPointDto[]>();

  for (const point of points) {
    if (point.asOfDate < rangeFrom || point.asOfDate > rangeTo) {
      continue;
    }
    const yearMonth = resolveCalendarYearMonth(point.asOfDate);
    if (!yearMonth) {
      continue;
    }
    const existing = buckets.get(yearMonth);
    if (existing) {
      existing.push(point);
      continue;
    }
    buckets.set(yearMonth, [point]);
  }

  result = [...buckets.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .flatMap(([yearMonth, bucketPoints]) => {
      // バケットは必ず1件以上の点を持つため resolveBucketPoint は null を返さない
      const resolved = resolveBucketPoint(
        bucketPoints,
        pick,
        minMaxField,
        yearMonth,
      )!;

      let aggregated: AggregatedTrendPoint = {
        ...resolved.point,
        asOfDate: resolved.isAveraged ? yearMonth : resolved.point.asOfDate,
        bucketKey: yearMonth,
        bucketLabel: formatCalendarMonthBucketLabel(yearMonth),
        sourceAsOfDate: resolved.isAveraged
          ? yearMonth
          : resolved.point.asOfDate,
        isAveraged: resolved.isAveraged || undefined,
      };
      return [aggregated];
    });

  return result;
}

function buildBaselinePointFromRaw(
  point: SnapshotTrendPointDto,
): AggregatedTrendPoint {
  let result = toAggregatedTrendPoint(point, point.asOfDate, "day", point.asOfDate);
  return result;
}

export function buildTrendDisplayPoints(
  points: SnapshotTrendPointDto[],
  unit: TrendDisplayUnit,
  rangeFrom: string,
  rangeTo: string,
  options?: TrendAggregationOptions,
): TrendDisplayPointsResult {
  let result: TrendDisplayPointsResult = {
    displayPoints: [],
    baselinePoint: null,
  };

  if (points.length === 0) {
    return result;
  }

  const allAggregated = aggregateTrendPoints(
    points,
    unit,
    rangeFrom,
    rangeTo,
    options,
  );

  result.displayPoints = allAggregated.filter(
    (point) => point.sourceAsOfDate >= rangeFrom && point.sourceAsOfDate <= rangeTo,
  );

  const priorRawPoints = [...points]
    .filter((point) => point.asOfDate < rangeFrom)
    .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate));
  const latestPrior = priorRawPoints.at(-1);
  if (latestPrior) {
    result.baselinePoint = buildBaselinePointFromRaw(latestPrior);
  }

  return result;
}

export function formatTrendSparseDataNote(
  rangeFrom: string,
  inRangePoints: SnapshotTrendPointDto[],
): string | null {
  let result: string | null = null;

  if (inRangePoints.length === 0) {
    return result;
  }

  const sorted = [...inRangePoints].sort((left, right) =>
    left.asOfDate.localeCompare(right.asOfDate),
  );
  const firstDate = sorted[0]?.asOfDate;
  if (!firstDate || firstDate <= rangeFrom) {
    return result;
  }

  result = `選択期間のうち ${formatIsoDateJaShort(firstDate)} 以降にデータがあります`;
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

export const __snapshotTrendAggregationTesting = {
  parseIsoDate,
  daysBetween,
  minIsoDate,
  resolveRollingBucketIndex,
  resolveRollingBucketStartDate,
  resolveRollingBucketEndDate,
  resolveRollingBucketKey,
  resolveMinMaxComparableValue,
  averageBucketPoints,
  resolveBucketPoint,
  toAggregatedTrendPoint,
  resolveAggregationOptions,
  averageAllocationsByScheme,
};
