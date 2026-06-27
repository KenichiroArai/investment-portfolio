import type { PortfolioAllocationRow, TargetPortfolioWeight } from "./portfolio-allocation";

export type TopAllocationHolding = {
  instrumentId: string;
  instrumentName: string;
  currentRatio: number;
};

export type LargestAllocationGap = {
  instrumentId: string;
  instrumentName: string;
  gapRatio: number;
};

export function pickTopAllocationHoldings(
  rows: PortfolioAllocationRow[],
  limit: number,
): TopAllocationHolding[] {
  let result: TopAllocationHolding[] = [];

  if (limit <= 0 || rows.length === 0) {
    return result;
  }

  const sortedRows = [...rows];
  sortedRows.sort((left, right) => right.currentRatio - left.currentRatio);

  for (const row of sortedRows.slice(0, limit)) {
    result.push({
      instrumentId: row.instrumentId,
      instrumentName: row.instrumentName,
      currentRatio: row.currentRatio,
    });
  }

  return result;
}

export function findLargestAllocationGap(
  rows: PortfolioAllocationRow[],
): LargestAllocationGap | null {
  let result: LargestAllocationGap | null = null;
  let largestAbsGap = -1;

  for (const row of rows) {
    if (row.gapRatio === null || !Number.isFinite(row.gapRatio)) {
      continue;
    }

    const absGap = Math.abs(row.gapRatio);
    if (absGap <= largestAbsGap) {
      continue;
    }

    largestAbsGap = absGap;
    result = {
      instrumentId: row.instrumentId,
      instrumentName: row.instrumentName,
      gapRatio: row.gapRatio,
    };
  }

  return result;
}

export function sumTargetPortfolioRatio(weights: TargetPortfolioWeight[]): number {
  let result = 0;

  for (const weight of weights) {
    if (!Number.isFinite(weight.targetRatio)) {
      continue;
    }
    result += weight.targetRatio;
  }

  return result;
}
