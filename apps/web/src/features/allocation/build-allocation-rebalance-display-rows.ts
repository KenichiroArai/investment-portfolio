import type {
  AllocationBySchemeWithLines,
  AllocationRebalanceByInstrumentResult,
  ClassificationSchemeWithValuesDto,
  TargetAllocationWeightDto,
} from "@repo/shared";
import {
  computeAllocationRebalanceByInstrument,
  normalizeTargetAllocationWeights,
} from "@repo/shared";

import type { RebalanceDisplayRow } from "@/features/allocation/RebalanceTable";

type BuildAllocationRebalanceDisplayRowsInput = {
  schemeAllocation: AllocationBySchemeWithLines;
  targets: TargetAllocationWeightDto[];
  depositMinor: number;
  mode: Parameters<typeof computeAllocationRebalanceByInstrument>[0]["mode"];
  classificationSchemes: ClassificationSchemeWithValuesDto[];
};

type AllocationRebalanceDisplayResult = AllocationRebalanceByInstrumentResult & {
  rows: RebalanceDisplayRow[];
};

export function buildAllocationRebalanceDisplayRows(
  input: BuildAllocationRebalanceDisplayRowsInput,
): AllocationRebalanceDisplayResult {
  let result: AllocationRebalanceDisplayResult = {
    sliceTrades: [],
    instrumentRows: [],
    totalBuyMinor: 0,
    totalSellMinor: 0,
    unallocatedDepositMinor: 0,
    rows: [],
  };

  const valueNameByCode = new Map<string, string>();

  for (const slice of input.schemeAllocation.slices) {
    valueNameByCode.set(slice.valueCode, slice.valueName);
  }

  const selectedClassificationScheme = input.classificationSchemes.find(
    (item) => item.code === input.schemeAllocation.schemeCode,
  );
  if (selectedClassificationScheme) {
    for (const value of selectedClassificationScheme.values) {
      valueNameByCode.set(value.code, value.name);
    }
  }

  const normalizedTargets = normalizeTargetAllocationWeights(input.targets);
  const classifiedTotalMinor = input.schemeAllocation.totalMarketValueMinor;

  const allocationRebalance = computeAllocationRebalanceByInstrument({
    schemeAllocation: input.schemeAllocation,
    targets: normalizedTargets,
    portfolioTotalMinor: classifiedTotalMinor,
    depositMinor: input.depositMinor,
    mode: input.mode,
  });

  const displayRows: RebalanceDisplayRow[] = [];

  for (const sliceTrade of allocationRebalance.sliceTrades) {
    const slice = input.schemeAllocation.slices.find(
      (item) => item.valueCode === sliceTrade.key,
    );
    const valueName = valueNameByCode.get(sliceTrade.key) ?? slice?.valueName ?? sliceTrade.key;
    const instrumentRows = allocationRebalance.instrumentRows.filter(
      (row) => row.valueCode === sliceTrade.key,
    );

    displayRows.push({
      ...sliceTrade,
      label: valueName,
      marketValueMinor: slice?.marketValueMinor ?? 0,
      isGroupHeader: true,
      groupKey: sliceTrade.key,
      groupLabel: valueName,
      indentLevel: 0,
      emptySliceNote:
        instrumentRows.length === 0 && sliceTrade.targetRatio !== null
          ? "（保有銘柄なしのため銘柄分解不可）"
          : undefined,
    });

    for (const instrumentRow of instrumentRows) {
      displayRows.push({
        ...instrumentRow,
        label: instrumentRow.instrumentName,
        groupKey: sliceTrade.key,
        groupLabel: valueName,
        isGroupHeader: false,
        indentLevel: 1,
      });
    }
  }

  result = {
    ...allocationRebalance,
    rows: displayRows,
  };
  return result;
}
