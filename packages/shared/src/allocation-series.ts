import type { SnapshotPeriodPreset } from "./snapshot-time-range";
import type { TrendDisplayUnit } from "./snapshot-trend-aggregation";

export type AllocationSeriesInput = {
  key: string;
  label: string;
  values: Array<number | null>;
};

export type CollapsedAllocationSeries = AllocationSeriesInput & {
  isOther?: boolean;
  otherMembers?: string[];
};

export type AllocationShareChange = {
  key: string;
  label: string;
  startRatio: number;
  endRatio: number;
  deltaRatio: number;
};

export const DEFAULT_ALLOCATION_TOP_N = 6;
export const OTHER_ALLOCATION_KEY = "__other__";
export const OTHER_ALLOCATION_LABEL = "その他";

function averageFiniteValues(values: Array<number | null> | undefined): number {
  let result = 0;
  const finite = (values ?? []).filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (finite.length === 0) {
    return result;
  }
  result = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  return result;
}

export function collapseAllocationSeries(
  series: AllocationSeriesInput[],
  topN: number = DEFAULT_ALLOCATION_TOP_N,
): CollapsedAllocationSeries[] {
  let result: CollapsedAllocationSeries[] = [];

  if (series.length === 0) {
    return result;
  }

  if (series.length <= topN) {
    result = series.map((item) => ({ ...item }));
    return result;
  }

  const ranked = [...series].sort(
    (left, right) =>
      averageFiniteValues(right.values) - averageFiniteValues(left.values),
  );
  const kept = ranked.slice(0, topN);
  const collapsed = ranked.slice(topN);

  for (const item of kept) {
    result.push({ ...item });
  }

  const bucketCount = series[0]?.values?.length ?? 0;
  const otherValues: Array<number | null> = [];
  for (let index = 0; index < bucketCount; index += 1) {
    let sum = 0;
    let hasValue = false;
    for (const item of collapsed) {
      const value = item.values?.[index] ?? null;
      if (value !== null && Number.isFinite(value)) {
        sum += value;
        hasValue = true;
      }
    }
    otherValues.push(hasValue ? sum : null);
  }

  result.push({
    key: OTHER_ALLOCATION_KEY,
    label: OTHER_ALLOCATION_LABEL,
    values: otherValues,
    isOther: true,
    otherMembers: collapsed.map((item) => item.label),
  });

  return result;
}

export function computeAllocationShareChanges(
  startRatios: Array<{ key: string; label: string; ratio: number | null }>,
  endRatios: Array<{ key: string; label: string; ratio: number | null }>,
): AllocationShareChange[] {
  let result: AllocationShareChange[] = [];

  const labelByKey = new Map<string, string>();
  for (const item of startRatios) {
    labelByKey.set(item.key, item.label);
  }
  for (const item of endRatios) {
    labelByKey.set(item.key, item.label);
  }

  const keys = new Set<string>([
    ...startRatios.map((item) => item.key),
    ...endRatios.map((item) => item.key),
  ]);

  for (const key of keys) {
    const startItem = startRatios.find((item) => item.key === key);
    const endItem = endRatios.find((item) => item.key === key);
    const startRatio = startItem?.ratio ?? 0;
    const endRatio = endItem?.ratio ?? 0;

    if (
      startItem?.ratio === null &&
      endItem?.ratio === null
    ) {
      continue;
    }

    if (
      !Number.isFinite(startRatio) &&
      !Number.isFinite(endRatio)
    ) {
      continue;
    }

    const safeStart = Number.isFinite(startRatio) ? startRatio : 0;
    const safeEnd = Number.isFinite(endRatio) ? endRatio : 0;
    const deltaRatio = safeEnd - safeStart;

    result.push({
      key,
      label: labelByKey.get(key) ?? key,
      startRatio: safeStart,
      endRatio: safeEnd,
      deltaRatio,
    });
  }

  result.sort(
    (left, right) => Math.abs(right.deltaRatio) - Math.abs(left.deltaRatio),
  );

  return result;
}

export function findLargestAllocationShareChange(
  changes: AllocationShareChange[],
): AllocationShareChange | null {
  let result: AllocationShareChange | null = null;

  if (changes.length === 0) {
    return result;
  }

  result = changes.reduce((largest, current) => {
    if (Math.abs(current.deltaRatio) > Math.abs(largest.deltaRatio)) {
      return current;
    }
    return largest;
  });

  return result;
}

export function resolveDefaultTrendDisplayUnit(
  preset: SnapshotPeriodPreset | null,
  rangeDayCount?: number | null,
): TrendDisplayUnit {
  let result: TrendDisplayUnit = "day";

  if (preset === "1w" || preset === "1m") {
    result = "day";
    return result;
  }

  if (preset === "3m" || preset === "6m") {
    result = "week";
    return result;
  }

  if (preset === "12m" || preset === "all") {
    result = "1m";
    return result;
  }

  if (rangeDayCount !== null && rangeDayCount !== undefined) {
    if (rangeDayCount <= 31) {
      result = "day";
      return result;
    }
    if (rangeDayCount <= 186) {
      result = "week";
      return result;
    }
    result = "1m";
    return result;
  }

  return result;
}
