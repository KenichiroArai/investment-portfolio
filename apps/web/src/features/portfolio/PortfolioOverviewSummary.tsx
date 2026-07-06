"use client";

import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  getPortfolioKindFeatures,
  resolveSnapshotTotalContributions,
  sumSnapshotBookValue,
  sumSnapshotMarketValue,
} from "@repo/shared";
import type { CurrentSnapshotDto } from "@repo/shared";
import type { ReactNode } from "react";

import { StatCard } from "@/components/stat-card";
import { formatPercent, formatYen } from "@/lib/format-yen";

const GAIN_RATE_ON_CONTRIBUTIONS_HINT = "損益 ÷ 拠出金累計";
const GAIN_RATE_ON_BOOK_VALUE_HINT = "損益 ÷ 購入金額合計";
const GAIN_RATE_ON_ASSET_BALANCE_HINT = "損益 ÷ 資産残高";

type PortfolioOverviewSummaryProps = {
  snapshot: CurrentSnapshotDto;
  portfolioKind: string;
  deltaHint?: string | null;
  className?: string;
};

export function PortfolioOverviewSummary({
  snapshot,
  portfolioKind,
  deltaHint = null,
  className,
}: PortfolioOverviewSummaryProps) {
  const features = getPortfolioKindFeatures(portfolioKind);
  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const totalBookValue = sumSnapshotBookValue(snapshot.lines);
  const totalContributions = resolveSnapshotTotalContributions(snapshot);
  const costBasis = features.showContributions ? totalContributions : totalBookValue;
  const portfolioGain = computeSnapshotPortfolioGainMinor(assetBalance, costBasis);
  const gainRateOnCostBasis = computeSnapshotGainRate(portfolioGain, costBasis);
  const gainRateOnAssetBalance = computeSnapshotGainRate(
    portfolioGain,
    assetBalance,
  );
  const gainRateOnCostBasisLabel =
    gainRateOnCostBasis === null ? "—" : formatPercent(gainRateOnCostBasis);
  const gainRateOnAssetBalanceLabel =
    gainRateOnAssetBalance === null
      ? "—"
      : formatPercent(gainRateOnAssetBalance);
  const gainClassName = portfolioGain >= 0 ? "text-positive" : "text-negative";
  const gainRateHint = features.showGainRateOnContributions
    ? GAIN_RATE_ON_CONTRIBUTIONS_HINT
    : GAIN_RATE_ON_BOOK_VALUE_HINT;

  let result: ReactNode = (
    <div className={className}>
      {deltaHint ? (
        <p className="mb-4 text-sm text-muted-foreground">{deltaHint}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="資産残高" value={formatYen(assetBalance)} />
        {features.showContributions ? (
          <StatCard label="拠出金累計" value={formatYen(totalContributions)} />
        ) : null}
        <StatCard
          label="損益"
          value={formatYen(portfolioGain)}
          valueClassName={gainClassName}
        />
        <StatCard
          label="損益率"
          value={gainRateOnCostBasisLabel}
          hint={gainRateHint}
          valueClassName={gainClassName}
        />
        <StatCard
          label="利益率"
          value={gainRateOnAssetBalanceLabel}
          hint={GAIN_RATE_ON_ASSET_BALANCE_HINT}
          valueClassName={gainClassName}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>
    </div>
  );
  return result;
}
