import type { TargetPortfolioWeight } from "./portfolio-allocation";
import type { AllocationSlice } from "./snapshot-allocation";
import { listSchemeTagAllocations } from "./snapshot-allocation";
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

    const tagAllocations = listSchemeTagAllocations(line.tags, schemeCode);
    if (tagAllocations.length === 0) {
      continue;
    }

    for (const allocation of tagAllocations) {
      const impliedTargetRatio = targetRatio * allocation.weight;
      const existing = totals.get(allocation.tag.valueCode);
      if (existing) {
        existing.impliedTargetRatio += impliedTargetRatio;
        continue;
      }

      totals.set(allocation.tag.valueCode, {
        valueName: allocation.tag.valueName,
        impliedTargetRatio,
      });
    }
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

export function normalizeImpliedAllocationTargets(
  rows: ImpliedAllocationTargetRow[],
): ImpliedAllocationTargetRow[] {
  let result: ImpliedAllocationTargetRow[] = [];

  let total = 0;
  for (const row of rows) {
    total += row.impliedTargetRatio;
  }

  if (total <= 0 || !Number.isFinite(total)) {
    return result;
  }

  for (const row of rows) {
    result.push({
      valueCode: row.valueCode,
      valueName: row.valueName,
      impliedTargetRatio: row.impliedTargetRatio / total,
    });
  }

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
