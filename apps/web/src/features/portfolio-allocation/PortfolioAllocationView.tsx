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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { PortfolioAllocationPanel } from "@/features/portfolio-allocation/PortfolioAllocationPanel";
import { TargetPortfolioSettingsCard } from "@/features/portfolio-allocation/TargetPortfolioSettingsCard";
import { usePortfolioRebalanceResult } from "@/features/portfolio-allocation/usePortfolioRebalanceResult";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { PortfolioDetailsPanel } from "@/features/portfolio/PortfolioDetailsPanel";
import { PortfolioOverviewSummary } from "@/features/portfolio/PortfolioOverviewSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { usePortfolioSubviewParam } from "@/features/portfolio/usePortfolioSubviewParam";
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
  const panel = subview.panel;
  const setPanel = subview.setPanel;
  const holdingsMode = subview.holdingsMode;
  const setHoldingsMode = subview.setHoldingsMode;

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

  result = (
    <PageContainer>
      <PortfolioOverviewSummary
        snapshot={snapshot}
        deltaHint={deltaHint}
        className="mb-6"
      />
      {mainView === "allocation" ? (
        <p className="mb-4 text-sm text-muted-foreground">
          目標設定済み: {targetCount} / {allocationRows.length} 銘柄
        </p>
      ) : null}
      <Tabs
        value={mainView}
        onValueChange={(value) => {
          setMainView(value as "details" | "allocation");
        }}
      >
        <TabsList aria-label="ポートフォリオ配分の表示">
          <TabsTrigger value="details">明細・推移</TabsTrigger>
          <TabsTrigger value="allocation">配分（リバランス）</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
          <PortfolioDetailsPanel
            portfolioCode={portfolioCode}
            panel={panel}
            onPanelChange={setPanel}
            holdingsMode={holdingsMode}
            onHoldingsModeChange={setHoldingsMode}
          />
        </TabsContent>
        <TabsContent value="allocation" className="mt-4">
          {allocationTabContent}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
  return result;
}
