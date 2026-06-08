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

export type TrendChartValueUnit = "yenMan" | "yen" | "percent";

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

  result = `${displayUnitLabel}・単位: %`;
  return result;
}

export function formatTrendChartCaption(displayUnitLabel: string): string {
  let result = formatTrendChartMeta(displayUnitLabel, "yenMan");
  return result;
}
