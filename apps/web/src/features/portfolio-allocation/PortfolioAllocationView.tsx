"use client";

import {
  buildPortfolioAllocationRows,
  sumSnapshotMarketValue,
} from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { WritableOnly } from "@/components/WritableOnly";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { PortfolioAllocationPanel } from "@/features/portfolio-allocation/PortfolioAllocationPanel";
import { PortfolioAllocationViewControls } from "@/features/portfolio-allocation/PortfolioAllocationViewControls";
import { TargetPortfolioSettingsCard } from "@/features/portfolio-allocation/TargetPortfolioSettingsCard";
import { usePortfolioRebalanceResult } from "@/features/portfolio-allocation/usePortfolioRebalanceResult";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { HoldingsDetailPanel } from "@/features/portfolio/HoldingsDetailPanel";
import { PortfolioOverviewSummary } from "@/features/portfolio/PortfolioOverviewSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import {
  usePortfolioSubviewParam,
  type PortfolioAllocationMainView,
} from "@/features/portfolio/usePortfolioSubviewParam";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { TrendPeriodSummary } from "@/features/trends/TrendPeriodSummary";
import { useTrendPeriodSummaryData } from "@/features/trends/useTrendPeriodSummaryData";
import { formatYen } from "@/lib/format-yen";

type PortfolioAllocationViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function PortfolioAllocationView({
  portfolioCode,
  portfolioKind: _portfolioKind,
}: PortfolioAllocationViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    isHistoricalView,
    currentAsOfDate,
    trends,
  } = usePortfolioTime();
  const { weights, loading: loadingWeights } = useTargetPortfolioWeights(portfolioCode);
  const { depositInput, setDepositInput, depositMinor, mode } = useRebalanceDeposit();

  const subview = usePortfolioSubviewParam({ page: "portfolio-allocation" });
  const mainView = subview.mainView;
  const setMainView = subview.setMainView;
  const holdingsMode = subview.holdingsMode;
  const setHoldingsMode = subview.setHoldingsMode;

  const trendPeriodSummaryData = useTrendPeriodSummaryData({ mode: "portfolio" });

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

  const rebalanceResult = usePortfolioRebalanceResult({
    lines: snapshot?.lines ?? [],
    weights,
    depositMinor,
    mode,
  });

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
        <Alert variant="destructive">
          <AlertDescription>ポートフォリオ配分の対象となる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const latestPoint =
    trends?.points.find((point) => point.asOfDate === currentAsOfDate) ??
    trends?.points[trends.points.length - 1];
  const deltaHint =
    isHistoricalView && latestPoint
      ? `最新比 評価額 ${formatYen(latestPoint.totalMarketValueMinor - assetBalance)}`
      : null;

  const allocationTabContent = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">銘柄別構成比</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioAllocationPanel rows={allocationRows} />
        </CardContent>
      </Card>

      <WritableOnly>
        <TargetPortfolioSettingsCard
          portfolioCode={portfolioCode}
          lines={snapshot.lines}
          disabled={isHistoricalView}
        />
      </WritableOnly>

      <RebalanceSettingsCard
        depositInput={depositInput}
        depositMinor={depositMinor}
        mode={mode}
        onDepositInputChange={setDepositInput}
        depositInputId="portfolio-allocation-rebalance-deposit"
      />

      <RebalanceTradesSummary
        rows={rebalanceResult.rows}
        totalBuyMinor={rebalanceResult.totalBuyMinor}
        totalSellMinor={rebalanceResult.totalSellMinor}
        unallocatedDepositMinor={rebalanceResult.unallocatedDepositMinor}
      />
    </div>
  );

  const renderTrendsOverview = (): ReactNode => {
    let overview: ReactNode = null;

    if (!trendPeriodSummaryData) {
      return overview;
    }

    overview = (
      <TrendPeriodSummary
        startDateLabel={trendPeriodSummaryData.startDateLabel}
        endDateLabel={trendPeriodSummaryData.endDateLabel}
        startMarketValueMinor={trendPeriodSummaryData.startMarketValueMinor}
        endMarketValueMinor={trendPeriodSummaryData.endMarketValueMinor}
        metricDeltas={trendPeriodSummaryData.metricDeltas}
        largestShareChange={null}
        sparseDataNote={trendPeriodSummaryData.sparseDataNote}
        singleBucketNote={trendPeriodSummaryData.singleBucketNote}
        baselineSummary={trendPeriodSummaryData.baselineSummary}
      />
    );
    return overview;
  };

  const renderAllocationOverview = (): ReactNode => {
    let overview = (
      <div className="space-y-1">
        <p className="text-sm font-medium">評価額合計: {formatYen(assetBalance)}</p>
        <p className="text-sm text-muted-foreground">
          目標設定済み: {targetCount} / {allocationRows.length} 銘柄
        </p>
      </div>
    );
    return overview;
  };

  result = (
    <PageContainer>
      <Tabs
        value={mainView}
        onValueChange={(value) => {
          setMainView(value as PortfolioAllocationMainView);
        }}
      >
        <PortfolioAllocationViewControls />
        <TabsContent value="holdings" className="mt-4">
          <div className="space-y-4">
            <PortfolioOverviewSummary snapshot={snapshot} deltaHint={deltaHint} />
            <HoldingsDetailPanel
              portfolioCode={portfolioCode}
              holdingsMode={holdingsMode}
              onHoldingsModeChange={setHoldingsMode}
            />
          </div>
        </TabsContent>
        <TabsContent value="trends" className="mt-4">
          <div className="space-y-4">
            {renderTrendsOverview()}
            <TrendsDetailPanel
              portfolioCode={portfolioCode}
              mode="portfolio"
              renderPeriodSummary={false}
            />
          </div>
        </TabsContent>
        <TabsContent value="allocation" className="mt-4">
          <div className="space-y-4">
            {renderAllocationOverview()}
            {allocationTabContent}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
  return result;
}
