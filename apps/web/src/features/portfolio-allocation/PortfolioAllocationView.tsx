"use client";

import {
  aggregatePortfolioTargetsByScheme,
  buildAllocationBySchemeWithLines,
  buildPortfolioAllocationRows,
  buildPortfolioCompositionGapRows,
  normalizeImpliedAllocationTargets,
  sumSnapshotMarketValue,
} from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { FormField } from "@/components/form-field";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { WritableOnly } from "@/components/WritableOnly";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { useAllocationSchemeParam } from "@/features/allocation/useAllocationSchemeParam";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { useTargetAllocations } from "@/features/allocation/useTargetAllocations";
import { ImpliedAllocationTargetsCard } from "@/features/portfolio-allocation/ImpliedAllocationTargetsCard";
import { PortfolioAllocationPanel } from "@/features/portfolio-allocation/PortfolioAllocationPanel";
import { TargetPortfolioSettingsCard } from "@/features/portfolio-allocation/TargetPortfolioSettingsCard";
import {
  usePortfolioAnalysisSchemes,
  usePortfolioRebalanceResult,
} from "@/features/portfolio-allocation/usePortfolioRebalanceResult";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { PortfolioDetailsPanel } from "@/features/portfolio/PortfolioDetailsPanel";
import { PortfolioOverviewSummary } from "@/features/portfolio/PortfolioOverviewSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { usePortfolioSubviewParam } from "@/features/portfolio/usePortfolioSubviewParam";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";

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
    selectedAsOfDate,
    isHistoricalView,
    currentAsOfDate,
    trends,
  } = usePortfolioTime();
  const { weights, loading: loadingWeights } = useTargetPortfolioWeights(portfolioCode);
  const { allocationsByScheme, loading: loadingAllocations } =
    useTargetAllocations(portfolioCode);
  const { depositInput, setDepositInput, depositMinor, mode } = useRebalanceDeposit();

  const subview = usePortfolioSubviewParam({ page: "portfolio-allocation" });
  const mainView = subview.mainView;
  const setMainView = subview.setMainView;
  const panel = subview.panel;
  const setPanel = subview.setPanel;
  const holdingsMode = subview.holdingsMode;
  const setHoldingsMode = subview.setHoldingsMode;

  const schemeConfigs = usePortfolioAnalysisSchemes(snapshot, portfolioKind);
  const schemeCodes = schemeConfigs.map((config) => config.schemeCode);
  const { activeSchemeCode, setActiveSchemeCode } = useAllocationSchemeParam({
    schemeCodes,
  });
  const activeScheme = schemeConfigs.find((item) => item.schemeCode === activeSchemeCode);

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

  const compositionGapRows = useMemo(() => {
    let result: ReturnType<typeof buildPortfolioCompositionGapRows> = [];

    if (!snapshot || activeSchemeCode === "" || !activeScheme) {
      return result;
    }

    const schemeAllocation = buildAllocationBySchemeWithLines(
      snapshot.lines,
      activeScheme.schemeCode,
      activeScheme.schemeName,
    );
    const impliedRows = normalizeImpliedAllocationTargets(
      aggregatePortfolioTargetsByScheme(
        snapshot.lines,
        weights,
        activeSchemeCode,
      ),
    );
    result = buildPortfolioCompositionGapRows(schemeAllocation.slices, impliedRows);
    return result;
  }, [activeScheme, activeSchemeCode, snapshot, weights]);

  const rebalanceResult = usePortfolioRebalanceResult({
    lines: snapshot?.lines ?? [],
    weights,
    depositMinor,
    mode,
  });

  const targetCount = allocationRows.filter((row) => row.targetRatio !== null).length;
  const allocationTargetsForScheme =
    activeSchemeCode !== "" ? (allocationsByScheme[activeSchemeCode] ?? []) : [];

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot || loadingWeights || loadingAllocations) {
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

      {schemeConfigs.length > 0 ? (
        <>
          <FormField label="分析軸" htmlFor="portfolio-allocation-scheme">
            <Select
              value={activeSchemeCode}
              onValueChange={(value) => {
                setActiveSchemeCode(value);
              }}
            >
              <SelectTrigger id="portfolio-allocation-scheme">
                <SelectValue placeholder="分析軸を選択" />
              </SelectTrigger>
              <SelectContent>
                {schemeConfigs.map((scheme) => {
                  let item = (
                    <SelectItem key={scheme.schemeCode} value={scheme.schemeCode}>
                      {scheme.schemeName}
                    </SelectItem>
                  );
                  return item;
                })}
              </SelectContent>
            </Select>
          </FormField>
          {activeScheme ? (
            <ImpliedAllocationTargetsCard
              gapRows={compositionGapRows}
              allocationTargets={allocationTargetsForScheme}
              schemeName={activeScheme.schemeName}
            />
          ) : null}
        </>
      ) : null}

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
        <TabsList>
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
