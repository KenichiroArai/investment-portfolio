export type TrendYAxisUnit = "yenMan" | "yen" | "percent" | "percentPoint";

export type TrendChartValueKind = "yen" | "percent" | "percentPoint";

const YEN_MAN_THRESHOLD_MINOR = 100_000;

export function resolveTrendYenAxisUnit(
  values: Array<number | null>,
): "yenMan" | "yen" {
  let result: "yenMan" | "yen" = "yen";
  let maxAbs = 0;

  for (const value of values) {
    if (value === null || !Number.isFinite(value)) {
      continue;
    }
    maxAbs = Math.max(maxAbs, Math.abs(value));
  }

  if (maxAbs >= YEN_MAN_THRESHOLD_MINOR) {
    result = "yenMan";
    return result;
  }

  return result;
}

export function resolveTrendYAxisUnit(
  values: Array<number | null>,
  valueKind: TrendChartValueKind,
): TrendYAxisUnit {
  let result: TrendYAxisUnit = "yen";

  if (valueKind === "percent") {
    result = "percent";
    return result;
  }

  if (valueKind === "percentPoint") {
    result = "percentPoint";
    return result;
  }

  result = resolveTrendYenAxisUnit(values);
  return result;
}

export function getTrendYAxisUnitLabel(unit: TrendYAxisUnit): string {
  let result = "円";

  if (unit === "yenMan") {
    result = "万円";
    return result;
  }

  if (unit === "percent") {
    result = "%";
    return result;
  }

  if (unit === "percentPoint") {
    result = "pt";
    return result;
  }

  return result;
}
