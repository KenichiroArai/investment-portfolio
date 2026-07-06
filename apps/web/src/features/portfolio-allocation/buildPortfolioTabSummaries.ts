import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  findLargestAllocationDivergence,
  getPortfolioKindFeatures,
  resolveSnapshotTotalContributions,
  sumSnapshotBookValue,
  sumSnapshotMarketValue,
  type AllocationShareChange,
  type CurrentSnapshotDto,
  type PortfolioAllocationRow,
  type TrendPeriodMetricDelta,
} from "@repo/shared";

import type { TabSummarySegment } from "@/features/portfolio-allocation/TabSummaryBar";
import {
  formatAllocationDivergenceRatio,
  formatAllocationPercentPoint,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";

type PortfolioRebalanceSummaryInput = {
  totalBuyMinor: number;
  totalSellMinor: number;
  unallocatedDepositMinor: number;
};

type PortfolioTrendSummaryInput = {
  startDateLabel: string;
  endDateLabel: string;
  startMarketValueMinor: number;
  endMarketValueMinor: number;
  metricDeltas: TrendPeriodMetricDelta[];
  largestShareChange?: AllocationShareChange | null;
};

function formatSignedYen(value: number): string {
  let result = formatYen(Math.abs(value));

  if (value > 0) {
    result = `+${result}`;
  }

  if (value < 0) {
    result = `-${result}`;
  }

  return result;
}

function resolveSignedValueClassName(value: number): string | undefined {
  let result: string | undefined = undefined;

  if (value > 0) {
    result = "text-positive";
  }

  if (value < 0) {
    result = "text-negative";
  }

  return result;
}

export function buildHoldingsTabSummarySegments(
  snapshot: CurrentSnapshotDto,
  portfolioKind: string,
): TabSummarySegment[] {
  let result: TabSummarySegment[] = [];

  const features = getPortfolioKindFeatures(portfolioKind);
  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const totalBookValue = sumSnapshotBookValue(snapshot.lines);
  const totalContributions = resolveSnapshotTotalContributions(snapshot);
  const costBasis = features.showContributions ? totalContributions : totalBookValue;
  const portfolioGain = computeSnapshotPortfolioGainMinor(assetBalance, costBasis);
  const gainRateOnCostBasis = computeSnapshotGainRate(portfolioGain, costBasis);
  const gainRateOnAssetBalance = computeSnapshotGainRate(portfolioGain, assetBalance);
  const gainClassName = resolveSignedValueClassName(portfolioGain);

  result = [
    {
      label: "資産残高",
      value: formatYen(assetBalance),
    },
    {
      label: "損益",
      value: formatYen(portfolioGain),
      valueClassName: gainClassName,
    },
    {
      label: "損益率",
      value: gainRateOnCostBasis === null ? "—" : formatPercent(gainRateOnCostBasis),
      valueClassName: gainClassName,
    },
    {
      label: "利益率",
      value:
        gainRateOnAssetBalance === null ? "—" : formatPercent(gainRateOnAssetBalance),
      valueClassName: gainClassName,
    },
  ];

  if (features.showContributions) {
    result.push({
      label: "拠出金",
      value: formatYen(totalContributions),
    });
  }

  return result;
}

export function buildCompositionTabSummarySegments(
  allocationRows: PortfolioAllocationRow[],
): TabSummarySegment[] {
  let result: TabSummarySegment[] = [];

  const largestDivergence = findLargestAllocationDivergence(allocationRows);

  if (largestDivergence === null) {
    return result;
  }

  result = [
    {
      label: "最大乖離銘柄",
      value: largestDivergence.instrumentName,
      valueSize: "default",
    },
    {
      label: "乖離率",
      value: formatAllocationDivergenceRatio(largestDivergence.gapDivergenceRatio),
      valueClassName: resolveSignedValueClassName(largestDivergence.gapRatio),
      valueSize: "primary",
    },
  ];

  return result;
}

export function buildTrendsTabSummarySegments(
  input: PortfolioTrendSummaryInput | null,
): TabSummarySegment[] {
  let result: TabSummarySegment[] = [];

  if (!input) {
    return result;
  }

  const marketValueDelta =
    input.endMarketValueMinor - input.startMarketValueMinor;
  const primaryMetric =
    input.metricDeltas.find((metric) => metric.key === "market-value") ??
    input.metricDeltas[0] ??
    null;

  if (input.largestShareChange) {
    result.push({
      label: "最大シェア変動",
      value: `${input.largestShareChange.label} ${formatAllocationPercentPoint(input.largestShareChange.deltaRatio)}`,
      valueClassName: resolveSignedValueClassName(input.largestShareChange.deltaRatio),
      valueSize: "primary",
    });
  }

  result = [
    ...result,
    {
      label: "期首",
      value: `${input.startDateLabel} ${formatYen(input.startMarketValueMinor)}`,
      valueSize: "compact",
    },
    {
      label: "期末",
      value: `${input.endDateLabel} ${formatYen(input.endMarketValueMinor)}`,
      valueSize: "default",
    },
    {
      label: "評価額増減",
      value: formatSignedYen(marketValueDelta),
      valueClassName: resolveSignedValueClassName(marketValueDelta),
      valueSize: "primary",
    },
  ];

  if (primaryMetric && primaryMetric.key !== "market-value") {
    result.push({
      label: primaryMetric.label,
      value: `${formatYen(primaryMetric.start)} → ${formatYen(primaryMetric.end)} (${formatSignedYen(primaryMetric.absoluteDelta)})`,
      valueClassName: resolveSignedValueClassName(primaryMetric.absoluteDelta),
      valueSize: "compact",
    });
  }

  return result;
}

export function buildRebalanceTabSummarySegments(
  targetCount: number,
  instrumentCount: number,
  rebalanceSummary: PortfolioRebalanceSummaryInput,
): TabSummarySegment[] {
  let result: TabSummarySegment[] = [
    {
      label: "目標",
      value: `${targetCount} / ${instrumentCount} 銘柄`,
      valueSize: "default",
    },
    {
      label: "合計買い",
      value: formatYen(rebalanceSummary.totalBuyMinor),
      valueSize: "primary",
    },
    {
      label: "合計売り",
      value: formatYen(rebalanceSummary.totalSellMinor),
    },
  ];

  if (rebalanceSummary.unallocatedDepositMinor > 0) {
    result.push({
      label: "未配分入金",
      value: formatYen(rebalanceSummary.unallocatedDepositMinor),
      valueClassName: "text-muted-foreground",
    });
  }

  return result;
}

export function buildTrendsTabSummaryNote(
  sparseDataNote: string | null | undefined,
  singleBucketNote: string | null | undefined,
  baselineSummary: string | null | undefined,
): string | null {
  let result: string | null = null;

  const notes = [sparseDataNote, singleBucketNote, baselineSummary].filter(
    (note): note is string => typeof note === "string" && note.trim() !== "",
  );

  if (notes.length === 0) {
    return result;
  }

  result = notes.join(" ");
  return result;
}
