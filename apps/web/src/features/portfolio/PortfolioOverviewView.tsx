"use client";

import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
  sumSnapshotMarketValue,
} from "@repo/shared";
import type { ReactNode } from "react";

import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { OverviewTrendChart } from "@/features/trends/OverviewTrendChart";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatAsOfDateJa,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type PortfolioOverviewViewProps = {
  portfolioCode: string;
};

const GAIN_RATE_ON_CONTRIBUTIONS_HINT = "損益 ÷ 拠出金累計";
const GAIN_RATE_ON_ASSET_BALANCE_HINT = "損益 ÷ 資産残高";

export function PortfolioOverviewView({
  portfolioCode,
}: PortfolioOverviewViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
    currentAsOfDate,
    trends,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot) {
    result = (
      <PageContainer>
        <LoadingSkeleton variant="cards" />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title={portfolioCode} />
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  if (!snapshot) {
    result = (
      <PageContainer>
        <PageHeader title={portfolioCode} />
        <Alert variant="destructive">
          <AlertDescription>明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const totalContributions = resolveSnapshotTotalContributions(snapshot);
  const portfolioGain = computeSnapshotPortfolioGainMinor(
    assetBalance,
    totalContributions,
  );
  const gainRateOnContributions = computeSnapshotGainRate(
    portfolioGain,
    totalContributions,
  );
  const gainRateOnAssetBalance = computeSnapshotGainRate(
    portfolioGain,
    assetBalance,
  );
  const gainRateOnContributionsLabel =
    gainRateOnContributions === null
      ? "—"
      : formatPercent(gainRateOnContributions);
  const gainRateOnAssetBalanceLabel =
    gainRateOnAssetBalance === null
      ? "—"
      : formatPercent(gainRateOnAssetBalance);
  const gainClassName = portfolioGain >= 0 ? "text-emerald-600" : "text-rose-600";

  const latestPoint =
    trends?.points.find((point) => point.asOfDate === currentAsOfDate) ??
    trends?.points[trends.points.length - 1];
  const deltaHint =
    isHistoricalView && latestPoint
      ? `最新比 評価額 ${formatYen(latestPoint.totalMarketValueMinor - assetBalance)}`
      : null;

  result = (
    <PageContainer>
      <PageHeader
        title="資産状況"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
              {isHistoricalView ? " · 履歴" : " · 現在"}
            </Badge>
          </div>
        }
      />
      {deltaHint ? (
        <p className="-mt-4 mb-4 text-sm text-muted-foreground">{deltaHint}</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="資産残高" value={formatYen(assetBalance)} />
        <StatCard label="拠出金累計" value={formatYen(totalContributions)} />
        <StatCard
          label="損益"
          value={formatYen(portfolioGain)}
          valueClassName={gainClassName}
        />
        <StatCard
          label="損益率"
          value={gainRateOnContributionsLabel}
          hint={GAIN_RATE_ON_CONTRIBUTIONS_HINT}
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
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">資産推移</CardTitle>
        </CardHeader>
        <CardContent>
          <OverviewTrendChart />
        </CardContent>
      </Card>
    </PageContainer>
  );
  return result;
}
