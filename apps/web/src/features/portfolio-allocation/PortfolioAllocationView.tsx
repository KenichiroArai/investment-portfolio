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
import {
  buildCompositionTabSummarySegments,
  buildHoldingsTabSummarySegments,
  buildRebalanceTabSummarySegments,
  buildTrendsTabSummaryNote,
  buildTrendsTabSummarySegments,
} from "@/features/portfolio-allocation/buildPortfolioTabSummaries";
import { PortfolioAllocationPanel } from "@/features/portfolio-allocation/PortfolioAllocationPanel";
import { PortfolioAllocationViewControls } from "@/features/portfolio-allocation/PortfolioAllocationViewControls";
import { TabSummaryBar } from "@/features/portfolio-allocation/TabSummaryBar";
import { TargetPortfolioSettingsCard } from "@/features/portfolio-allocation/TargetPortfolioSettingsCard";
import { usePortfolioRebalanceResult } from "@/features/portfolio-allocation/usePortfolioRebalanceResult";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { HoldingsDetailPanel } from "@/features/portfolio/HoldingsDetailPanel";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import {
  usePortfolioSubviewParam,
  type PortfolioAllocationMainView,
} from "@/features/portfolio/usePortfolioSubviewParam";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { useTrendPeriodSummaryData } from "@/features/trends/useTrendPeriodSummaryData";
import { formatYen } from "@/lib/format-yen";

type PortfolioAllocationViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function PortfolioAllocationView({
  portfolioCode,
  portfolioKind,
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

  const holdingsSummarySegments = buildHoldingsTabSummarySegments(
    snapshot,
    portfolioKind,
  );
  const compositionSummarySegments = buildCompositionTabSummarySegments(allocationRows);
  const trendsSummarySegments = buildTrendsTabSummarySegments(
    trendPeriodSummaryData
      ? {
          startDateLabel: trendPeriodSummaryData.startDateLabel,
          endDateLabel: trendPeriodSummaryData.endDateLabel,
          startMarketValueMinor: trendPeriodSummaryData.startMarketValueMinor,
          endMarketValueMinor: trendPeriodSummaryData.endMarketValueMinor,
          metricDeltas: trendPeriodSummaryData.metricDeltas,
          largestShareChange: trendPeriodSummaryData.largestShareChange,
        }
      : null,
  );
  const trendsSummaryNote = buildTrendsTabSummaryNote(
    trendPeriodSummaryData?.sparseDataNote,
    trendPeriodSummaryData?.singleBucketNote,
    trendPeriodSummaryData?.baselineSummary,
  );
  const rebalanceSummarySegments = buildRebalanceTabSummarySegments(
    targetCount,
    allocationRows.length,
    {
      totalBuyMinor: rebalanceResult.totalBuyMinor,
      totalSellMinor: rebalanceResult.totalSellMinor,
      unallocatedDepositMinor: rebalanceResult.unallocatedDepositMinor,
    },
  );

  const compositionTabContent = (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">銘柄別構成比</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <PortfolioAllocationPanel rows={allocationRows} />
      </CardContent>
    </Card>
  );

  const rebalanceTabContent = (
    <div className="space-y-6">
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
    let overview: ReactNode = (
      <TabSummaryBar segments={trendsSummarySegments} note={trendsSummaryNote} />
    );
    return overview;
  };

  const renderAllocationOverview = (): ReactNode => {
    let overview = <TabSummaryBar segments={compositionSummarySegments} />;
    return overview;
  };

  result = (
    <PageContainer>
      <Tabs
        value={mainView}
        className="min-w-0 w-full"
        onValueChange={(value) => {
          setMainView(value as PortfolioAllocationMainView);
        }}
      >
        <PortfolioAllocationViewControls />
        <TabsContent value="holdings" className="mt-4 min-w-0 max-w-full">
          <div className="min-w-0 space-y-4">
            <TabSummaryBar segments={holdingsSummarySegments} note={deltaHint} />
            <HoldingsDetailPanel
              portfolioCode={portfolioCode}
              portfolioKind={portfolioKind}
              holdingsMode={holdingsMode}
              onHoldingsModeChange={setHoldingsMode}
            />
          </div>
        </TabsContent>
        <TabsContent value="composition" className="mt-4 min-w-0 max-w-full">
          <div className="min-w-0 space-y-4">
            {renderAllocationOverview()}
            {compositionTabContent}
          </div>
        </TabsContent>
        <TabsContent value="trends" className="mt-4 min-w-0 max-w-full">
          <div className="min-w-0 space-y-4">
            {renderTrendsOverview()}
            <TrendsDetailPanel
              portfolioCode={portfolioCode}
              mode="portfolio"
              renderPeriodSummary={false}
            />
          </div>
        </TabsContent>
        <TabsContent value="rebalance" className="mt-4 min-w-0 max-w-full">
          <div className="min-w-0 space-y-4">
            <TabSummaryBar segments={rebalanceSummarySegments} />
            {rebalanceTabContent}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
  return result;
}
