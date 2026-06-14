import type { AllocationSlice } from "./snapshot-allocation";

export type TargetAllocationWeight = {
  valueCode: string;
  targetRatio: number;
};

export type AllocationGapRow = {
  valueCode: string;
  valueName: string;
  currentRatio: number;
  targetRatio: number | null;
  gapRatio: number | null;
  gapMarketValueMinor: number | null;
  marketValueMinor: number;
};

export function buildAllocationGapRows(
  slices: AllocationSlice[],
  targets: TargetAllocationWeight[],
  assetTotalMinor: number,
): AllocationGapRow[] {
  let result: AllocationGapRow[] = [];

  const targetByCode = new Map<string, number>();
  for (const target of targets) {
    targetByCode.set(target.valueCode, target.targetRatio);
  }

  for (const slice of slices) {
    const currentRatio =
      assetTotalMinor > 0 ? slice.marketValueMinor / assetTotalMinor : 0;
    const targetRatio = targetByCode.get(slice.valueCode) ?? null;
    let gapRatio: number | null = null;
    let gapMarketValueMinor: number | null = null;

    if (targetRatio !== null && Number.isFinite(targetRatio)) {
      gapRatio = currentRatio - targetRatio;
      if (assetTotalMinor > 0) {
        gapMarketValueMinor = Math.round(gapRatio * assetTotalMinor);
      }
    }

    result.push({
      valueCode: slice.valueCode,
      valueName: slice.valueName,
      currentRatio,
      targetRatio,
      gapRatio,
      gapMarketValueMinor,
      marketValueMinor: slice.marketValueMinor,
    });
  }

  return result;
}

export function mergeAllocationGapIntoSlices<T extends AllocationSlice>(
  slices: T[],
  gapRows: AllocationGapRow[],
): Array<T & Pick<AllocationGapRow, "targetRatio" | "gapRatio" | "gapMarketValueMinor">> {
  let result: Array<
    T & Pick<AllocationGapRow, "targetRatio" | "gapRatio" | "gapMarketValueMinor">
  > = [];

  const gapByCode = new Map(gapRows.map((row) => [row.valueCode, row]));

  for (const slice of slices) {
    const gap = gapByCode.get(slice.valueCode);
    result.push({
      ...slice,
      targetRatio: gap?.targetRatio ?? null,
      gapRatio: gap?.gapRatio ?? null,
      gapMarketValueMinor: gap?.gapMarketValueMinor ?? null,
    });
  }

  return result;
}
