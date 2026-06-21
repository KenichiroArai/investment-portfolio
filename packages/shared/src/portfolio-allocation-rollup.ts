import type { TargetPortfolioWeight } from "./portfolio-allocation";
import type { AllocationSlice } from "./snapshot-allocation";
import type { HoldingLineDto } from "./types";

export const UNTAGGED_ALLOCATION_VALUE_CODE = "__untagged__";
export const UNTAGGED_ALLOCATION_VALUE_NAME = "未分類";

export type ImpliedAllocationTargetRow = {
  valueCode: string;
  valueName: string;
  impliedTargetRatio: number;
};

export function aggregatePortfolioTargetsByScheme(
  lines: HoldingLineDto[],
  targets: TargetPortfolioWeight[],
  schemeCode: string,
): ImpliedAllocationTargetRow[] {
  let result: ImpliedAllocationTargetRow[] = [];

  const targetByInstrumentId = new Map<string, number>();
  for (const target of targets) {
    targetByInstrumentId.set(target.instrumentId, target.targetRatio);
  }

  const totals = new Map<string, { valueName: string; impliedTargetRatio: number }>();

  for (const line of lines) {
    const targetRatio = targetByInstrumentId.get(line.instrumentId);
    if (targetRatio === undefined || !Number.isFinite(targetRatio)) {
      continue;
    }

    const tag = line.tags.find((item) => item.schemeCode === schemeCode);
    const valueCode = tag?.valueCode ?? UNTAGGED_ALLOCATION_VALUE_CODE;
    const valueName = tag?.valueName ?? UNTAGGED_ALLOCATION_VALUE_NAME;

    const existing = totals.get(valueCode);
    if (existing) {
      existing.impliedTargetRatio += targetRatio;
      continue;
    }

    totals.set(valueCode, {
      valueName,
      impliedTargetRatio: targetRatio,
    });
  }

  for (const [valueCode, item] of totals) {
    result.push({
      valueCode,
      valueName: item.valueName,
      impliedTargetRatio: item.impliedTargetRatio,
    });
  }

  result.sort((left, right) => right.impliedTargetRatio - left.impliedTargetRatio);
  return result;
}

export type PortfolioCompositionGapRow = {
  valueCode: string;
  valueName: string;
  currentRatio: number;
  targetRatio: number | null;
  gapRatio: number | null;
  marketValueMinor: number;
};

export function buildPortfolioCompositionGapRows(
  slices: AllocationSlice[],
  impliedTargets: ImpliedAllocationTargetRow[],
): PortfolioCompositionGapRow[] {
  let result: PortfolioCompositionGapRow[] = [];

  const sliceByCode = new Map(slices.map((slice) => [slice.valueCode, slice]));
  const impliedByCode = new Map(impliedTargets.map((row) => [row.valueCode, row]));
  const allCodes = new Set([...sliceByCode.keys(), ...impliedByCode.keys()]);

  for (const valueCode of allCodes) {
    const slice = sliceByCode.get(valueCode);
    const implied = impliedByCode.get(valueCode);
    const currentRatio = slice?.weight ?? 0;
    const targetRatio = implied?.impliedTargetRatio ?? null;
    let gapRatio: number | null = null;

    if (targetRatio !== null && Number.isFinite(targetRatio)) {
      gapRatio = currentRatio - targetRatio;
    }

    result.push({
      valueCode,
      valueName: slice?.valueName ?? implied?.valueName ?? valueCode,
      currentRatio,
      targetRatio,
      gapRatio,
      marketValueMinor: slice?.marketValueMinor ?? 0,
    });
  }

  result.sort((left, right) => {
    const leftTarget = left.targetRatio ?? 0;
    const rightTarget = right.targetRatio ?? 0;
    if (rightTarget !== leftTarget) {
      return rightTarget - leftTarget;
    }
    return right.currentRatio - left.currentRatio;
  });
  return result;
}
