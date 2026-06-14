"use client";

import {
  buildPortfolioAllocationRows,
  sumSnapshotMarketValue,
} from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioAllocationPanel } from "@/features/portfolio-allocation/PortfolioAllocationPanel";
import { TargetPortfolioSettingsCard } from "@/features/portfolio-allocation/TargetPortfolioSettingsCard";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";

type PortfolioAllocationViewProps = {
  portfolioCode: string;
};

export function PortfolioAllocationView({ portfolioCode }: PortfolioAllocationViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
  } = usePortfolioTime();
  const { weights, loading: loadingWeights } = useTargetPortfolioWeights(portfolioCode);

  const allocationRows = useMemo(() => {
    let result = snapshot
      ? buildPortfolioAllocationRows(
          snapshot.lines,
          weights,
          sumSnapshotMarketValue(snapshot.lines),
        )
      : [];
    return result;
  }, [snapshot, weights]);

  const targetCount = allocationRows.filter((row) => row.targetRatio !== null).length;

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot || loadingWeights) {
    result = (
      <PageContainer>
        <LoadingSkeleton />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title="ポートフォリオ配分" />
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
        <PageHeader title="ポートフォリオ配分" />
        <Alert variant="destructive">
          <AlertDescription>ポートフォリオ配分の対象となる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const asOfDate = selectedAsOfDate ?? snapshot.asOfDate;
  const totalValue = sumSnapshotMarketValue(snapshot.lines);

  result = (
    <PageContainer>
      <PageHeader
        title="ポートフォリオ配分"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatAsOfDateJa(asOfDate)}</Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴</Badge> : null}
          </div>
        }
      />
      <div className="mb-4 space-y-1">
        <p className="text-sm font-medium">評価額合計: {formatYen(totalValue)}</p>
        <p className="text-sm text-muted-foreground">
          目標設定済み: {targetCount} / {allocationRows.length} 銘柄
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">銘柄別構成比</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioAllocationPanel rows={allocationRows} />
          </CardContent>
        </Card>

        <TargetPortfolioSettingsCard
          portfolioCode={portfolioCode}
          lines={snapshot.lines}
          disabled={isHistoricalView}
        />
      </div>
    </PageContainer>
  );
  return result;
}
