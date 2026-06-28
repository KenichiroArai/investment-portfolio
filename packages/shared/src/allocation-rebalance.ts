import type { TargetAllocationWeight } from "./allocation-gap";
import {
  computeRebalanceTrades,
  distributeAmountProportionally,
  type RebalanceMode,
  type RebalanceTradeRow,
} from "./rebalance";
import type { AllocationBySchemeWithLines, AllocationSliceWithLines } from "./snapshot-allocation";

export type AllocationRebalanceInstrumentRow = RebalanceTradeRow & {
  instrumentId: string;
  instrumentName: string;
  valueCode: string;
  valueName: string;
  marketValueMinor: number;
};

export type AllocationRebalanceByInstrumentResult = {
  sliceTrades: RebalanceTradeRow[];
  instrumentRows: AllocationRebalanceInstrumentRow[];
  totalBuyMinor: number;
  totalSellMinor: number;
  unallocatedDepositMinor: number;
};

function buildSliceRowsWithTargets(
  schemeAllocation: AllocationBySchemeWithLines,
  targets: TargetAllocationWeight[],
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [...schemeAllocation.slices];
  const sliceByCode = new Map(result.map((slice) => [slice.valueCode, slice]));

  for (const target of targets) {
    if (sliceByCode.has(target.valueCode)) {
      continue;
    }

    result.push({
      valueCode: target.valueCode,
      valueName: target.valueCode,
      marketValueMinor: 0,
      weight: 0,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      lines: [],
    });
  }

  return result;
}

export function computeAllocationRebalanceByInstrument(input: {
  schemeAllocation: AllocationBySchemeWithLines;
  targets: TargetAllocationWeight[];
  portfolioTotalMinor: number;
  depositMinor: number;
  mode: RebalanceMode;
}): AllocationRebalanceByInstrumentResult {
  let result: AllocationRebalanceByInstrumentResult = {
    sliceTrades: [],
    instrumentRows: [],
    totalBuyMinor: 0,
    totalSellMinor: 0,
    unallocatedDepositMinor: 0,
  };

  const targetByCode = new Map<string, number>();
  for (const target of input.targets) {
    targetByCode.set(target.valueCode, target.targetRatio);
  }

  const slices = buildSliceRowsWithTargets(input.schemeAllocation, input.targets);

  const sliceTradeResult = computeRebalanceTrades({
    rows: slices.map((slice) => ({
      key: slice.valueCode,
      marketValueMinor: slice.marketValueMinor,
      targetRatio: targetByCode.get(slice.valueCode) ?? null,
    })),
    depositMinor: input.depositMinor,
    mode: input.mode,
    portfolioTotalMinor: input.portfolioTotalMinor,
  });

  const instrumentRows: AllocationRebalanceInstrumentRow[] = [];
  let totalBuyMinor = 0;
  let totalSellMinor = 0;

  for (const sliceTrade of sliceTradeResult.rows) {
    const slice = slices.find((item) => item.valueCode === sliceTrade.key);
    if (!slice || slice.lines.length === 0) {
      continue;
    }

    const netTradeMinor = sliceTrade.buyMinor - sliceTrade.sellMinor;
    if (netTradeMinor === 0) {
      continue;
    }

    const weights = slice.lines.map((lineInSlice) => ({
      key: lineInSlice.line.instrumentId,
      weight: lineInSlice.weightInSlice,
    }));
    const tradeByInstrument = distributeAmountProportionally(weights, netTradeMinor);

    for (const lineInSlice of slice.lines) {
      const line = lineInSlice.line;
      const tradeMinor = tradeByInstrument.get(line.instrumentId) ?? 0;
      const buyMinor = tradeMinor > 0 ? tradeMinor : 0;
      const sellMinor = tradeMinor < 0 ? -tradeMinor : 0;
      const sliceTargetRatio = sliceTrade.targetRatio;
      let targetRatio: number | null = null;
      let gapRatio: number | null = null;

      if (sliceTargetRatio !== null && Number.isFinite(sliceTargetRatio)) {
        targetRatio = sliceTargetRatio * lineInSlice.weightInSlice;
        const currentRatio =
          input.portfolioTotalMinor > 0
            ? line.marketValueMinor / input.portfolioTotalMinor
            : 0;
        gapRatio = currentRatio - targetRatio;
      }

      totalBuyMinor += buyMinor;
      totalSellMinor += sellMinor;

      instrumentRows.push({
        key: `${slice.valueCode}:${line.instrumentId}`,
        instrumentId: line.instrumentId,
        instrumentName: line.instrumentName,
        valueCode: slice.valueCode,
        valueName: slice.valueName,
        marketValueMinor: line.marketValueMinor,
        currentRatio:
          input.portfolioTotalMinor > 0
            ? line.marketValueMinor / input.portfolioTotalMinor
            : 0,
        targetRatio,
        gapRatio,
        targetMarketValueMinor:
          targetRatio !== null
            ? Math.round(input.portfolioTotalMinor * targetRatio)
            : null,
        buyMinor,
        sellMinor,
      });
    }
  }

  result = {
    sliceTrades: sliceTradeResult.rows,
    instrumentRows,
    totalBuyMinor,
    totalSellMinor,
    unallocatedDepositMinor: sliceTradeResult.unallocatedDepositMinor,
  };
  return result;
}
