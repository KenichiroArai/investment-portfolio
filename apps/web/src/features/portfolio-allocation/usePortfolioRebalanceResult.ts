"use client";

import {
  aggregatePortfolioTargetsByScheme,
  buildPortfolioAllocationRows,
  computeRebalanceTrades,
  resolveAnalysisSchemes,
  sumSnapshotMarketValue,
  type RebalanceMode,
} from "@repo/shared";
import { useMemo } from "react";

import type { RebalanceDisplayRow } from "@/features/allocation/RebalanceTable";

type UsePortfolioRebalanceResultInput = {
  lines: Parameters<typeof buildPortfolioAllocationRows>[0];
  weights: Parameters<typeof buildPortfolioAllocationRows>[1];
  depositMinor: number;
  mode: RebalanceMode;
};

export function usePortfolioRebalanceResult({
  lines,
  weights,
  depositMinor,
  mode,
}: UsePortfolioRebalanceResultInput) {
  const result = useMemo(() => {
    let rebalanceResult = {
      rows: [] as RebalanceDisplayRow[],
      totalBuyMinor: 0,
      totalSellMinor: 0,
      unallocatedDepositMinor: 0,
    };

    const totalValue = sumSnapshotMarketValue(lines);
    const allocationRows = buildPortfolioAllocationRows(lines, weights, totalValue);
    const trades = computeRebalanceTrades({
      rows: allocationRows.map((row) => ({
        key: row.holdingLineId,
        marketValueMinor: row.marketValueMinor,
        targetRatio: row.targetRatio,
      })),
      depositMinor,
      mode,
    });

    rebalanceResult = {
      ...trades,
      rows: trades.rows.map((row) => {
        const source = allocationRows.find((item) => item.holdingLineId === row.key);
        let displayRow: RebalanceDisplayRow = {
          ...row,
          label: source?.instrumentName ?? row.key,
          marketValueMinor: source?.marketValueMinor ?? 0,
        };
        return displayRow;
      }),
    };
    return rebalanceResult;
  }, [depositMinor, lines, mode, weights]);

  return result;
}

export function useImpliedAllocationRows(
  lines: Parameters<typeof aggregatePortfolioTargetsByScheme>[0],
  weights: Parameters<typeof aggregatePortfolioTargetsByScheme>[1],
  activeSchemeCode: string,
) {
  const result = useMemo(() => {
    let impliedRows =
      activeSchemeCode !== ""
        ? aggregatePortfolioTargetsByScheme(lines, weights, activeSchemeCode)
        : [];
    return impliedRows;
  }, [activeSchemeCode, lines, weights]);

  return result;
}

export function usePortfolioAnalysisSchemes(
  snapshot: Parameters<typeof resolveAnalysisSchemes>[0] | null,
  portfolioKind: string,
) {
  const result = useMemo(() => {
    let schemeConfigs = snapshot ? resolveAnalysisSchemes(snapshot, portfolioKind) : [];
    return schemeConfigs;
  }, [portfolioKind, snapshot]);

  return result;
}
