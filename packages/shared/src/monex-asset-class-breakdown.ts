export type MonexInstrumentAssetClassBreakdownEntry = {
  valueCode: string;
  allocationWeight: number;
};

function addMarketValueByInstrumentName(
  totals: Map<string, Map<string, number>>,
  instrumentName: string,
  valueCode: string,
  marketValueMinor: number,
): void {
  let result: void = undefined;

  if (!Number.isFinite(marketValueMinor) || marketValueMinor <= 0) {
    return result;
  }

  let byClass = totals.get(instrumentName);
  if (!byClass) {
    byClass = new Map<string, number>();
    totals.set(instrumentName, byClass);
  }

  const existing = byClass.get(valueCode) ?? 0;
  byClass.set(valueCode, existing + marketValueMinor);
  return result;
}

function resolveCanonicalInstrumentName(
  instrumentName: string,
  aliasMap: Map<string, string[]>,
): string {
  let result = instrumentName;

  for (const [canonicalName, aliases] of aliasMap) {
    if (canonicalName === instrumentName || aliases.includes(instrumentName)) {
      result = canonicalName;
      return result;
    }
  }

  return result;
}

function normalizeBreakdownEntries(
  marketValueByClass: Map<string, number>,
): MonexInstrumentAssetClassBreakdownEntry[] {
  let result: MonexInstrumentAssetClassBreakdownEntry[] = [];

  let total = 0;
  for (const marketValueMinor of marketValueByClass.values()) {
    total += marketValueMinor;
  }

  /* v8 ignore start */
  if (total <= 0 || !Number.isFinite(total)) {
    return result;
  }
  /* v8 ignore stop */

  for (const [valueCode, marketValueMinor] of marketValueByClass) {
    result.push({
      valueCode,
      allocationWeight: marketValueMinor / total,
    });
  }

  result.sort((left, right) => right.allocationWeight - left.allocationWeight);
  return result;
}

export function buildMonexInstrumentAssetClassBreakdownFromMarketValues(
  rows: Array<{
    instrumentName: string;
    valueCode: string;
    marketValueMinor: number;
  }>,
  aliasMap: Map<string, string[]> = new Map(),
): Map<string, MonexInstrumentAssetClassBreakdownEntry[]> {
  let result = new Map<string, MonexInstrumentAssetClassBreakdownEntry[]>();
  const totals = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const canonicalName = resolveCanonicalInstrumentName(row.instrumentName, aliasMap);
    addMarketValueByInstrumentName(
      totals,
      canonicalName,
      row.valueCode,
      row.marketValueMinor,
    );
  }

  for (const [instrumentName, marketValueByClass] of totals) {
    const breakdown = normalizeBreakdownEntries(marketValueByClass);
    /* v8 ignore start */
    if (breakdown.length === 0) {
      continue;
    }
    /* v8 ignore stop */
    result.set(instrumentName, breakdown);
  }

  return result;
}

export function resolveMonexInstrumentAssetClassBreakdown(
  breakdownMap: Map<string, MonexInstrumentAssetClassBreakdownEntry[]>,
  instrumentName: string,
  additionalMatchNames: string[],
): MonexInstrumentAssetClassBreakdownEntry[] {
  let result: MonexInstrumentAssetClassBreakdownEntry[] = [];

  const direct = breakdownMap.get(instrumentName);
  if (direct) {
    result = direct;
    return result;
  }

  for (const aliasName of additionalMatchNames) {
    const aliasBreakdown = breakdownMap.get(aliasName);
    if (aliasBreakdown) {
      result = aliasBreakdown;
      return result;
    }
  }

  return result;
}
