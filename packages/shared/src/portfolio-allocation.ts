import type { HoldingLineDto } from "./types";
import { compareNullableNumbers, compareStrings, type SortDirection } from "./table-sort";

export type TargetPortfolioWeight = {
  instrumentId: string;
  targetRatio: number;
};

export type PortfolioInstrumentOrderFields = {
  sortOrder: number | null;
  instrumentName: string;
  instrumentId: string;
};

export type PortfolioAllocationRow = PortfolioInstrumentOrderFields & {
  holdingLineId: string;
  marketValueMinor: number;
  currentRatio: number;
  targetRatio: number | null;
  gapRatio: number | null;
  gapDivergenceRatio: number | null;
  gapMarketValueMinor: number | null;
};

export type PortfolioAllocationSortColumn =
  | "instrumentName"
  | "sortOrder"
  | "marketValue"
  | "currentRatio"
  | "targetRatio"
  | "gapRatio"
  | "gapDivergenceRatio";

export function comparePortfolioInstrumentOrder(
  left: PortfolioInstrumentOrderFields,
  right: PortfolioInstrumentOrderFields,
): number {
  let result = 0;
  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
  result = leftOrder - rightOrder;
  if (result !== 0) {
    return result;
  }
  result = left.instrumentName.localeCompare(right.instrumentName, "ja");
  if (result !== 0) {
    return result;
  }
  result = left.instrumentId.localeCompare(right.instrumentId, "ja");
  return result;
}

export function comparePortfolioAllocationRows(
  left: PortfolioAllocationRow,
  right: PortfolioAllocationRow,
  column: PortfolioAllocationSortColumn,
  direction: SortDirection,
): number {
  let result = 0;

  if (column === "instrumentName") {
    result = compareStrings(left.instrumentName, right.instrumentName, direction);
  } else if (column === "sortOrder") {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    result = compareNullableNumbers(leftOrder, rightOrder, direction);
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.marketValueMinor,
      right.marketValueMinor,
      direction,
    );
  } else if (column === "currentRatio") {
    result = compareNullableNumbers(left.currentRatio, right.currentRatio, direction);
  } else if (column === "targetRatio") {
    result = compareNullableNumbers(left.targetRatio, right.targetRatio, direction);
  } else if (column === "gapRatio") {
    result = compareNullableNumbers(left.gapRatio, right.gapRatio, direction);
  } else if (column === "gapDivergenceRatio") {
    result = compareNullableNumbers(
      left.gapDivergenceRatio,
      right.gapDivergenceRatio,
      direction,
    );
  }

  if (result !== 0) {
    return result;
  }

  result = comparePortfolioInstrumentOrder(left, right);
  if (result !== 0) {
    return result;
  }

  result = left.holdingLineId.localeCompare(right.holdingLineId, "ja");
  return result;
}

export function sortPortfolioAllocationRows(
  rows: PortfolioAllocationRow[],
  column: PortfolioAllocationSortColumn,
  direction: SortDirection,
): PortfolioAllocationRow[] {
  let result = [...rows];
  result.sort((left, right) => comparePortfolioAllocationRows(left, right, column, direction));
  return result;
}

export function sortHoldingLinesByPortfolioInstrumentOrder(
  lines: HoldingLineDto[],
): HoldingLineDto[] {
  let result = [...lines];
  result.sort(comparePortfolioInstrumentOrder);
  return result;
}

export function computePortfolioGapDivergenceRatio(
  currentRatio: number,
  targetRatio: number,
): number | null {
  let result: number | null = null;

  if (!Number.isFinite(currentRatio) || !Number.isFinite(targetRatio)) {
    return result;
  }

  const absGap = Math.abs(currentRatio - targetRatio);

  if (targetRatio === 0) {
    if (currentRatio === 0) {
      result = 0;
    }
    return result;
  }

  result = absGap / Math.abs(targetRatio);
  return result;
}

function buildPortfolioAllocationGapFields(
  currentRatio: number,
  targetRatio: number | null,
  assetTotalMinor: number,
): Pick<
  PortfolioAllocationRow,
  "gapRatio" | "gapDivergenceRatio" | "gapMarketValueMinor"
> {
  let result: Pick<
    PortfolioAllocationRow,
    "gapRatio" | "gapDivergenceRatio" | "gapMarketValueMinor"
  > = {
    gapRatio: null,
    gapDivergenceRatio: null,
    gapMarketValueMinor: null,
  };

  if (targetRatio === null || !Number.isFinite(targetRatio)) {
    return result;
  }

  const gapRatio = currentRatio - targetRatio;
  result = {
    gapRatio,
    gapDivergenceRatio: computePortfolioGapDivergenceRatio(currentRatio, targetRatio),
    gapMarketValueMinor:
      assetTotalMinor > 0 ? Math.round(gapRatio * assetTotalMinor) : null,
  };
  return result;
}

export function rollupPortfolioAllocationRowsByInstrument(
  rows: PortfolioAllocationRow[],
  assetTotalMinor: number,
): PortfolioAllocationRow[] {
  let result: PortfolioAllocationRow[] = [];

  const grouped = new Map<string, PortfolioAllocationRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.instrumentId);
    if (existing) {
      existing.push(row);
      continue;
    }
    grouped.set(row.instrumentId, [row]);
  }

  for (const [instrumentId, groupRows] of grouped) {
    const representative = groupRows.reduce((best, row) => {
      const bestOrder = best.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rowOrder = row.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (rowOrder < bestOrder) {
        return row;
      }
      return best;
    });
    const marketValueMinor = groupRows.reduce(
      (sum, row) => sum + row.marketValueMinor,
      0,
    );
    const currentRatio = assetTotalMinor > 0 ? marketValueMinor / assetTotalMinor : 0;
    const sortOrder = representative.sortOrder;
    const targetRatio =
      groupRows.find((row) => row.targetRatio !== null)?.targetRatio ?? null;
    const gapFields = buildPortfolioAllocationGapFields(
      currentRatio,
      targetRatio,
      assetTotalMinor,
    );

    result.push({
      holdingLineId: instrumentId,
      instrumentId,
      instrumentName: representative.instrumentName,
      sortOrder,
      marketValueMinor,
      currentRatio,
      targetRatio,
      ...gapFields,
    });
  }

  result = sortPortfolioAllocationRows(result, "sortOrder", "asc");
  return result;
}

export function buildPortfolioAllocationRows(
  lines: HoldingLineDto[],
  targets: TargetPortfolioWeight[],
  assetTotalMinor: number,
): PortfolioAllocationRow[] {
  let result: PortfolioAllocationRow[] = [];

  const targetByInstrumentId = new Map<string, number>();
  for (const target of targets) {
    targetByInstrumentId.set(target.instrumentId, target.targetRatio);
  }

  const lineRows: PortfolioAllocationRow[] = [];
  for (const line of lines) {
    const currentRatio =
      assetTotalMinor > 0 ? line.marketValueMinor / assetTotalMinor : 0;
    const targetRatio = targetByInstrumentId.get(line.instrumentId) ?? null;
    const gapFields = buildPortfolioAllocationGapFields(
      currentRatio,
      targetRatio,
      assetTotalMinor,
    );

    lineRows.push({
      holdingLineId: line.id,
      instrumentId: line.instrumentId,
      instrumentName: line.instrumentName,
      sortOrder: line.sortOrder,
      marketValueMinor: line.marketValueMinor,
      currentRatio,
      targetRatio,
      ...gapFields,
    });
  }

  result = rollupPortfolioAllocationRowsByInstrument(lineRows, assetTotalMinor);
  return result;
}
