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
