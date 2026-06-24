"use client";

import type { ClassificationSchemeWithValuesDto } from "@repo/shared";
import Link from "next/link";
import {
  buildAllocationBySchemeWithLines,
  buildAllocationGapRows,
  buildAllocationPeriodChangeRows,
  findLargestAllocationShareChange,
  mergeAllocationGapIntoSlices,
  resolveAnalysisSchemes,
  sumSnapshotMarketValue,
  type AnalysisSchemeConfig,
} from "@repo/shared";
import { Settings } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AllocationPeriodShareSummary } from "@/features/allocation/AllocationPeriodShareSummary";
import { AllocationSchemeTabs } from "@/features/allocation/AllocationSchemeTabs";
import { AllocationSnapshotPanel } from "@/features/allocation/AllocationSnapshotPanel";
import { buildAllocationRebalanceDisplayRows } from "@/features/allocation/build-allocation-rebalance-display-rows";
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { TargetAllocationEditCard } from "@/features/allocation/TargetAllocationEditCard";
import { useAllocationSchemeParam } from "@/features/allocation/useAllocationSchemeParam";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { useTargetAllocations } from "@/features/allocation/useTargetAllocations";
import { PortfolioOverviewSummary } from "@/features/portfolio/PortfolioOverviewSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { usePortfolioSubviewParam } from "@/features/portfolio/usePortfolioSubviewParam";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { buildTrendChartBuckets } from "@/features/trends/trend-chart-buckets";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { WritableOnly } from "@/components/WritableOnly";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchClassificationSchemes } from "@/lib/api-client";
import { isWritableDataSource } from "@/lib/data-source";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type AnalysisViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function AnalysisView({
  portfolioCode,
  portfolioKind,
}: AnalysisViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
    displayTrendPoints,
    baselinePoint,
    trendDisplayUnit,
    loadingTrends,
    currentAsOfDate,
    trends,
  } = usePortfolioTime();
  const { allocationsByScheme, refetch: refetchTargetAllocations } =
    useTargetAllocations(portfolioCode);
  const { depositInput, setDepositInput, depositMinor, mode } = useRebalanceDeposit();
  const subview = usePortfolioSubviewParam({ page: "analysis" });
  const mainView = subview.mainView;
  const setMainView = subview.setMainView;

  const [classificationSchemes, setClassificationSchemes] = useState<
    ClassificationSchemeWithValuesDto[]
  >([]);
  const [loadingSchemes, setLoadingSchemes] = useState(isWritableDataSource());

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    if (!isWritableDataSource()) {
      return result;
    }

    async function loadSchemes() {
      let loadResult: void = undefined;

      setLoadingSchemes(true);
      const response = await fetchClassificationSchemes(portfolioCode);

      if (cancelled) {
        return loadResult;
      }

      setLoadingSchemes(false);

      if (response.ok) {
        setClassificationSchemes(response.data);
      } else {
        setClassificationSchemes([]);
      }

      return loadResult;
    }

    void loadSchemes();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode]);

  const schemeConfigs = snapshot
    ? resolveAnalysisSchemes(snapshot, portfolioKind)
    : [];
  const schemeCodes = schemeConfigs.map((config) => config.schemeCode);
  const { activeSchemeCode, setActiveSchemeCode } = useAllocationSchemeParam({
    schemeCodes,
  });

  const periodShareChange = useMemo(() => {
    let largestChange = null;

    if (displayTrendPoints.length === 0 || activeSchemeCode === "") {
      return largestChange;
    }

    const chartBuckets = buildTrendChartBuckets({
      displayPoints: displayTrendPoints,
      baselinePoint,
      trendDisplayUnit,
      formatBaselineSummary: () => null,
    });

    let periodEndpoints: {
      start: (typeof displayTrendPoints)[number];
      end: (typeof displayTrendPoints)[number];
    } | null = null;

    if (displayTrendPoints.length === 1 && baselinePoint) {
      periodEndpoints = {
        start: baselinePoint,
        end: displayTrendPoints[0],
      };
    } else if (displayTrendPoints.length > 1) {
      periodEndpoints = {
        start: displayTrendPoints[0],
        end: displayTrendPoints[displayTrendPoints.length - 1],
      };
    }

    if (!periodEndpoints) {
      return largestChange;
    }

    const periodChangeRows = buildAllocationPeriodChangeRows(
      periodEndpoints.start,
      periodEndpoints.end,
      chartBuckets.chartPoints,
      activeSchemeCode,
    );

    largestChange = findLargestAllocationShareChange(
      periodChangeRows.map((row) => ({
        key: row.key,
        label: row.label,
        startRatio: row.startRatio,
        endRatio: row.endRatio,
        deltaRatio: row.deltaRatio,
      })),
    );

    return largestChange;
  }, [activeSchemeCode, baselinePoint, displayTrendPoints, trendDisplayUnit]);

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot || loadingSchemes) {
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
        <PageHeader title="資産配分" />
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
        <PageHeader title="資産配分" />
        <Alert variant="destructive">
          <AlertDescription>資産配分の対象となる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  if (schemeConfigs.length === 0) {
    result = (
      <PageContainer>
        <PageHeader title="資産配分" />
        <p className="text-sm text-muted-foreground">
          この口座種別の資産配分軸はまだ定義されていません。
        </p>
      </PageContainer>
    );
    return result;
  }

  const asOfDate = selectedAsOfDate ?? snapshot.asOfDate;
  const totalValue = sumSnapshotMarketValue(snapshot.lines);
  const activeClassificationScheme =
    classificationSchemes.find((scheme) => scheme.code === activeSchemeCode) ?? null;
  const activeSchemeTargets =
    activeSchemeCode !== "" ? (allocationsByScheme[activeSchemeCode] ?? []) : [];
  const activeSchemeValueCount = activeClassificationScheme?.values.length ?? 0;
  const activeSchemeTargetCount = activeSchemeTargets.length;

  const assetBalance = totalValue;
  const latestPoint =
    trends?.points.find((point) => point.asOfDate === currentAsOfDate) ??
    trends?.points[trends.points.length - 1];
  const deltaHint =
    isHistoricalView && latestPoint
      ? `最新比 評価額 ${formatYen(latestPoint.totalMarketValueMinor - assetBalance)}`
      : null;

  const allocationTabContent = (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">評価額合計: {formatYen(totalValue)}</p>
          {activeSchemeValueCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              目標設定済み: {activeSchemeTargetCount} / {activeSchemeValueCount} 分類
            </p>
          ) : null}
        </div>
        <AllocationPeriodShareSummary
          largestShareChange={periodShareChange}
          loading={loadingTrends}
        />
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => {
            setMainView("trends");
          }}
        >
          この軸の推移を見る
        </Button>
      </div>

      <AllocationSchemeTabs
        schemes={schemeConfigs}
        activeSchemeCode={activeSchemeCode}
        onSchemeChange={setActiveSchemeCode}
        renderPanel={(scheme: AnalysisSchemeConfig) => {
          const schemeAllocation = buildAllocationBySchemeWithLines(
            snapshot.lines,
            scheme.schemeCode,
            scheme.schemeName,
          );
          const targets = allocationsByScheme[scheme.schemeCode] ?? [];
          const targetTotalRatio =
            targets.length > 0
              ? targets.reduce((sum, target) => sum + target.targetRatio, 0)
              : null;
          const gapRows = buildAllocationGapRows(
            schemeAllocation.slices,
            targets,
          );
          const slicesWithGap = mergeAllocationGapIntoSlices(
            schemeAllocation.slices,
            gapRows,
          );

          const rebalanceResult = buildAllocationRebalanceDisplayRows({
            schemeAllocation,
            targets,
            depositMinor,
            mode,
            classificationSchemes,
          });
          const hasUncovered =
            schemeAllocation.totalMarketValueMinor < totalValue;
          const rebalanceDescription = hasUncovered
            ? "未分類の銘柄は売買対象外です。目標はタグ付き銘柄内で100%に正規化して試算しています。構成単位の売買を、各構成内の現状比率で銘柄に按分して表示します。"
            : "構成単位の売買を、各構成内の現状比率で銘柄に按分して表示します。";
          const rebalanceSection = (
            <>
              <RebalanceSettingsCard
                depositInput={depositInput}
                depositMinor={depositMinor}
                mode={mode}
                onDepositInputChange={setDepositInput}
                depositInputId="analysis-rebalance-deposit"
              />

              <RebalanceTradesSummary
                description={rebalanceDescription}
                rows={rebalanceResult.rows}
                totalBuyMinor={rebalanceResult.totalBuyMinor}
                totalSellMinor={rebalanceResult.totalSellMinor}
                unallocatedDepositMinor={rebalanceResult.unallocatedDepositMinor}
                grouped
              />
            </>
          );

          const classificationValues =
            classificationSchemes.find((item) => item.code === scheme.schemeCode)
              ?.values ?? [];

          let panel = (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{scheme.schemeName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AllocationSnapshotPanel
                    slices={slicesWithGap}
                    axisTotalMinor={schemeAllocation.totalMarketValueMinor}
                    assetTotalMinor={totalValue}
                    targetTotalRatio={targetTotalRatio}
                    portfolioCode={portfolioCode}
                    schemeCode={scheme.schemeCode}
                    asOfDate={asOfDate}
                  />
                </CardContent>
              </Card>

              <WritableOnly>
                <TargetAllocationEditCard
                  portfolioCode={portfolioCode}
                  schemeCode={scheme.schemeCode}
                  values={classificationValues}
                  disabled={isHistoricalView}
                  onSaved={() => {
                    void refetchTargetAllocations();
                  }}
                />
              </WritableOnly>

              {rebalanceSection}
            </div>
          );
          return panel;
        }}
      />
    </div>
  );

  result = (
    <PageContainer>
      <PageHeader
        title="資産配分"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatAsOfDateJa(asOfDate)}</Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴</Badge> : null}
            <WritableOnly>
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPortfolioPath(portfolioCode, "settings", "classification")}>
                  <Settings className="h-4 w-4" />
                  分類設定
                </Link>
              </Button>
            </WritableOnly>
          </div>
        }
      />
      <PortfolioOverviewSummary
        snapshot={snapshot}
        deltaHint={deltaHint}
        className="mb-6"
      />
      <Tabs
        value={mainView}
        onValueChange={(value) => {
          setMainView(value as "trends" | "allocation");
        }}
      >
        <TabsList>
          <TabsTrigger value="trends">推移</TabsTrigger>
          <TabsTrigger value="allocation">配分（リバランス）</TabsTrigger>
        </TabsList>
        <TabsContent value="trends" className="mt-4">
          <TrendsDetailPanel portfolioCode={portfolioCode} mode="allocation" />
        </TabsContent>
        <TabsContent value="allocation" className="mt-4">
          {allocationTabContent}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
  return result;
}
