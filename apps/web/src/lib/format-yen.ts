export function formatYen(minor: number): string {
  let result = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(minor);
  return result;
}

export function formatAsOfDateJa(iso: string): string {
  let result = iso;
  const parts = iso.split("-");

  if (parts.length === 3) {
    result = `${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  return result;
}

export function formatPercent(ratio: number): string {
  let result = "—";

  if (!Number.isFinite(ratio)) {
    return result;
  }

  result = `${(ratio * 100).toFixed(1)}%`;
  return result;
}

export function formatAllocationPercent(ratio: number): string {
  let result = "—";

  if (!Number.isFinite(ratio)) {
    return result;
  }

  result = `${(ratio * 100).toFixed(2)}%`;
  return result;
}

export function formatAllocationDivergenceRatio(ratio: number): string {
  let result = "—";

  if (!Number.isFinite(ratio)) {
    return result;
  }

  result = `${(ratio * 100).toFixed(1)}%`;
  return result;
}

export function formatPercentAxis(ratio: number): string {
  let result = "0%";

  if (!Number.isFinite(ratio)) {
    return result;
  }

  const percent = ratio * 100;
  const abs = Math.abs(percent);

  if (abs >= 10) {
    result = `${percent.toFixed(0)}%`;
    return result;
  }

  if (abs >= 1) {
    result = `${percent.toFixed(1)}%`;
    return result;
  }

  result = `${percent.toFixed(2)}%`;
  return result;
}

function formatSignedPointValue(points: number, decimals: number): string {
  let result = points.toFixed(decimals);

  if (points > 0) {
    result = `+${result}`;
  }

  return result;
}

export function formatPercentPoint(ratioDelta: number): string {
  let result = "—";

  if (!Number.isFinite(ratioDelta)) {
    return result;
  }

  const points = ratioDelta * 100;
  const abs = Math.abs(points);
  const decimals = abs >= 1 ? 1 : 2;
  result = `${formatSignedPointValue(points, decimals)} pt`;
  return result;
}

export function formatAllocationPercentPoint(ratioDelta: number): string {
  let result = "—";

  if (!Number.isFinite(ratioDelta)) {
    return result;
  }

  const points = ratioDelta * 100;
  result = `${formatSignedPointValue(points, 2)} pt`;
  return result;
}

export function formatPercentPointAxis(ratioDelta: number): string {
  let result = "0 pt";

  if (!Number.isFinite(ratioDelta)) {
    return result;
  }

  const points = ratioDelta * 100;
  const abs = Math.abs(points);
  const decimals = abs >= 1 ? 1 : 2;
  result = `${points.toFixed(decimals)} pt`;
  return result;
}

export function formatPercentRelativeChange(ratio: number): string {
  let result = "—";

  if (!Number.isFinite(ratio)) {
    return result;
  }

  const percent = ratio * 100;
  const abs = Math.abs(percent);
  let decimals = 2;

  if (abs >= 10) {
    decimals = 1;
  } else if (abs >= 1) {
    decimals = 1;
  }

  result = `${formatSignedPointValue(percent, decimals)}%`;
  return result;
}

export function formatTrendDeltaTooltip(
  previous: number | null,
  current: number | null,
  formatAbsolute: (value: number) => string,
): string {
  let result = "—";

  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return result;
  }

  const absoluteDelta = current - previous;
  let relativeText = "—";

  if (previous !== 0) {
    relativeText = formatPercentRelativeChange(absoluteDelta / Math.abs(previous));
  }

  result = `${formatAbsolute(absoluteDelta)} (${relativeText})`;
  return result;
}

export function formatYenTrendDeltaTooltip(
  previous: number | null,
  current: number | null,
): string {
  let result = formatTrendDeltaTooltip(previous, current, formatSignedYenDelta);
  return result;
}

export function resolveTrendTooltipPrevious(
  levelValues: Array<number | null>,
  index: number,
  baselineValue?: number | null,
): number | null {
  let result: number | null = null;

  if (index > 0) {
    result = levelValues[index - 1] ?? null;
    return result;
  }

  if (
    baselineValue !== null &&
    baselineValue !== undefined &&
    Number.isFinite(baselineValue)
  ) {
    result = baselineValue;
  }

  return result;
}

export function formatPercentPeriodDeltaSuffix(
  previous: number | null,
  current: number | null,
): string | null {
  let result: string | null = null;

  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return result;
  }

  const ratioDelta = current - previous;
  let relativeText = "—";

  if (previous !== 0) {
    relativeText = formatPercentRelativeChange(ratioDelta / Math.abs(previous));
  }

  result = `${formatPercentPoint(ratioDelta)} / ${relativeText}`;
  return result;
}

export function formatYenLevelDeltaTooltip(
  previous: number | null,
  current: number | null,
): string {
  let result = "—";

  if (current === null || !Number.isFinite(current)) {
    return result;
  }

  result = formatYen(current);

  if (previous === null || !Number.isFinite(previous)) {
    return result;
  }

  result = `${result} (${formatYenTrendDeltaTooltip(previous, current)})`;
  return result;
}

export function formatPercentLevelDeltaTooltip(
  previous: number | null,
  current: number | null,
): string {
  let result = "—";

  if (current === null || !Number.isFinite(current)) {
    return result;
  }

  result = formatPercent(current);

  const deltaSuffix = formatPercentPeriodDeltaSuffix(previous, current);
  if (deltaSuffix === null) {
    return result;
  }

  result = `${result} (${deltaSuffix})`;
  return result;
}

export function formatRelativeRateBarTooltip(
  previous: number | null,
  current: number | null,
  relativeRate: number,
  formatAbsolute: (value: number) => string,
): string {
  let result = formatPercentRelativeChange(relativeRate);

  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return result;
  }

  result = `${result} (${formatAbsolute(current - previous)})`;
  return result;
}

export function formatPercentDeltaTooltip(
  previous: number | null,
  current: number | null,
): string {
  let result = "—";

  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return result;
  }

  const ratioDelta = current - previous;
  let relativeText = "—";

  if (previous !== 0) {
    relativeText = formatPercentRelativeChange(ratioDelta / Math.abs(previous));
  }

  result = `${formatPercent(previous)} → ${formatPercent(current)} (${formatPercentPoint(ratioDelta)} / ${relativeText})`;
  return result;
}

export function formatAllocationPercentLevelDeltaTooltip(
  previous: number | null,
  current: number | null,
): string {
  let result = "—";

  if (current === null || !Number.isFinite(current)) {
    return result;
  }

  result = formatAllocationPercent(current);

  const deltaSuffix = formatAllocationPercentPeriodDeltaSuffix(previous, current);
  if (deltaSuffix === null) {
    return result;
  }

  result = `${result} (${deltaSuffix})`;
  return result;
}

export function formatAllocationPercentDeltaTooltip(
  previous: number | null,
  current: number | null,
): string {
  let result = "—";

  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return result;
  }

  const ratioDelta = current - previous;
  let relativeText = "—";

  if (previous !== 0) {
    relativeText = formatPercentRelativeChange(ratioDelta / Math.abs(previous));
  }

  result = `${formatAllocationPercent(previous)} → ${formatAllocationPercent(current)} (${formatAllocationPercentPoint(ratioDelta)} / ${relativeText})`;
  return result;
}

export function formatAllocationPercentPeriodDeltaSuffix(
  previous: number | null,
  current: number | null,
): string | null {
  let result: string | null = null;

  if (
    previous === null ||
    current === null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return result;
  }

  const ratioDelta = current - previous;
  let relativeText = "—";

  if (previous !== 0) {
    relativeText = formatPercentRelativeChange(ratioDelta / Math.abs(previous));
  }

  result = `${formatAllocationPercentPoint(ratioDelta)} / ${relativeText}`;
  return result;
}

function formatManNumber(man: number): string {
  let result = "0";
  const abs = Math.abs(man);

  if (!Number.isFinite(man)) {
    return result;
  }

  if (abs >= 100) {
    result = man.toFixed(0);
    return result;
  }

  if (Number.isInteger(man) || Math.abs(man - Math.round(man)) < 0.05) {
    result = `${Math.round(man)}`;
    return result;
  }

  result = man.toFixed(1);
  return result;
}

export function formatYenMan(minor: number): string {
  let result = "—";

  if (!Number.isFinite(minor)) {
    return result;
  }

  result = `${formatManNumber(minor / 10_000)}万円`;
  return result;
}

export function formatYenManAxis(minor: number): string {
  let result = "0";

  if (!Number.isFinite(minor)) {
    return result;
  }

  result = formatManNumber(minor / 10_000);
  return result;
}

export function formatYenAxis(minor: number): string {
  let result = "0";

  if (!Number.isFinite(minor)) {
    return result;
  }

  result = new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(minor);
  return result;
}

export function formatYenAxisLabel(minor: number): string {
  let result = "0円";

  if (!Number.isFinite(minor)) {
    return result;
  }

  result = `${formatYenAxis(minor)}円`;
  return result;
}

export type TrendChartValueUnit = "yenMan" | "yen" | "percent" | "percentPoint";

export function formatTrendChartMeta(
  displayUnitLabel: string,
  valueUnit: TrendChartValueUnit,
): string {
  let result = displayUnitLabel;

  if (valueUnit === "yenMan") {
    result = `${displayUnitLabel}・金額単位: 万円`;
    return result;
  }

  if (valueUnit === "yen") {
    result = `${displayUnitLabel}・金額単位: 円`;
    return result;
  }

  if (valueUnit === "percentPoint") {
    result = `${displayUnitLabel}・単位: ポイント`;
    return result;
  }

  result = `${displayUnitLabel}・単位: %`;
  return result;
}

export function formatTrendChartCaption(displayUnitLabel: string): string {
  let result = formatTrendChartMeta(displayUnitLabel, "yenMan");
  return result;
}

export function formatSignedYenDelta(minor: number): string {
  let result = formatYen(minor);

  if (!Number.isFinite(minor)) {
    return result;
  }

  if (minor > 0) {
    result = `+${result}`;
  }

  return result;
}

export function formatSignedIntegerDelta(value: number): string {
  let result = new Intl.NumberFormat("ja-JP").format(value);

  if (!Number.isFinite(value)) {
    return result;
  }

  if (value > 0) {
    result = `+${result}`;
  }

  return result;
}

export function formatMarketValueBaselineSummary(
  baselineDate: string,
  deltaMinor: number,
): string {
  let result = `前回（${formatAsOfDateJa(baselineDate)}）比 評価額 ${formatSignedYenDelta(deltaMinor)}`;
  return result;
}
