import type { TargetPortfolioWeight } from "./portfolio-allocation";
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
