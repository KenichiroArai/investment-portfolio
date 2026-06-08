export type TrendChartDomainMode = "includeZero" | "fitData";

function collectFiniteValues(values: Array<number | null>): number[] {
  let result: number[] = [];

  for (const value of values) {
    if (value === null || !Number.isFinite(value)) {
      continue;
    }
    result.push(value);
  }

  return result;
}

export function resolveTrendChartValueRange(
  values: Array<number | null>,
  mode: TrendChartDomainMode,
): { min: number; max: number } {
  let result = { min: 0, max: 1 };
  const finiteValues = collectFiniteValues(values);

  if (finiteValues.length === 0) {
    return result;
  }

  let rawMin = finiteValues[0];
  let rawMax = finiteValues[0];

  for (const value of finiteValues) {
    rawMin = Math.min(rawMin, value);
    rawMax = Math.max(rawMax, value);
  }

  if (mode === "includeZero") {
    if (rawMin > 0) {
      rawMin = 0;
    }
    if (rawMax < 0) {
      rawMax = 0;
    }
    result = { min: rawMin, max: rawMax };
    return result;
  }

  const range = rawMax - rawMin;
  const padding =
    range > 0
      ? range * 0.1
      : Math.max(Math.abs(rawMax), Math.abs(rawMin), 0.01) * 0.1;
  let min = rawMin - padding;
  let max = rawMax + padding;
  const allNonNegative = finiteValues.every((value) => value >= 0);

  if (allNonNegative && min < 0) {
    min = 0;
  }

  result = { min, max };
  return result;
}

export function resolveTrendSeriesValueDomain(
  series: Array<{ values: Array<number | null> }>,
  mode: TrendChartDomainMode,
): { min: number; max: number } {
  let result = { min: 0, max: 1 };
  const allValues = series.flatMap((item) => item.values);
  result = resolveTrendChartValueRange(allValues, mode);
  return result;
}
