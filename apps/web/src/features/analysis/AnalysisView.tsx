"use client";

import type { ClassificationSchemeWithValuesDto } from "@repo/shared";
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
import { useEffect, useState, type ReactNode } from "react";

import { AnalysisTabPanel } from "@/features/analysis/AnalysisTabPanel";
import { AnalysisViewControls } from "@/features/analysis/AnalysisViewControls";
import { AnalysisPanelSummary } from "@/features/analysis/AnalysisPanelSummary";
import { AllocationPeriodShareSummary } from "@/features/allocation/AllocationPeriodShareSummary";
import { AllocationSnapshotPanel } from "@/features/allocation/AllocationSnapshotPanel";
import { buildAllocationRebalanceDisplayRows } from "@/features/allocation/build-allocation-rebalance-display-rows";
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { TargetAllocationEditCard } from "@/features/allocation/TargetAllocationEditCard";
import { useAllocationSchemeParam } from "@/features/allocation/useAllocationSchemeParam";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { useTargetAllocations } from "@/features/allocation/useTargetAllocations";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import {
  usePortfolioSubviewParam,
  type AnalysisMainView,
} from "@/features/portfolio/usePortfolioSubviewParam";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { TrendPeriodSummary } from "@/features/trends/TrendPeriodSummary";
import { buildTrendChartBuckets } from "@/features/trends/trend-chart-buckets";
import { useTrendPeriodSummaryData } from "@/features/trends/useTrendPeriodSummaryData";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { WritableOnly } from "@/components/WritableOnly";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { fetchClassificationSchemes } from "@/lib/api-client";
import { isWritableDataSource } from "@/lib/data-source";
import { formatYen } from "@/lib/format-yen";

type AnalysisViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

function resolveSchemePeriodShareChange(
  schemeCode: string,
  displayTrendPoints: ReturnType<typeof usePortfolioTime>["displayTrendPoints"],
  baselinePoint: ReturnType<typeof usePortfolioTime>["baselinePoint"],
  trendDisplayUnit: ReturnType<typeof usePortfolioTime>["trendDisplayUnit"],
) {
  let largestChange = null;

  if (displayTrendPoints.length === 0 || schemeCode === "") {
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
    schemeCode,
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
}

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

  const trendPeriodSummaryData = useTrendPeriodSummaryData({
    mode: "allocation",
    schemeCode: activeSchemeCode,
  });

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
          <AlertDescription>資産配分の対象となる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  if (schemeConfigs.length === 0) {
    result = (
      <PageContainer>
        <p className="text-sm text-muted-foreground">
          この口座種別の資産配分軸はまだ定義されていません。
        </p>
      </PageContainer>
    );
    return result;
  }

  const asOfDate = selectedAsOfDate ?? snapshot.asOfDate;
  const totalValue = sumSnapshotMarketValue(snapshot.lines);
  const activeScheme =
    schemeConfigs.find((scheme) => scheme.schemeCode === activeSchemeCode) ??
    schemeConfigs[0];

  const renderAllocationOverview = (scheme: AnalysisSchemeConfig): ReactNode => {
    const classificationScheme =
      classificationSchemes.find((item) => item.code === scheme.schemeCode) ?? null;
    const schemeTargets = allocationsByScheme[scheme.schemeCode] ?? [];
    const schemeValueCount = classificationScheme?.values.length ?? 0;
    const schemeTargetCount = schemeTargets.length;
    const schemePeriodShareChange = resolveSchemePeriodShareChange(
      scheme.schemeCode,
      displayTrendPoints,
      baselinePoint,
      trendDisplayUnit,
    );

    let overview = (
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">評価額合計: {formatYen(totalValue)}</p>
          {schemeValueCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              目標設定済み: {schemeTargetCount} / {schemeValueCount} 分類
            </p>
          ) : null}
        </div>
        <AllocationPeriodShareSummary
          largestShareChange={schemePeriodShareChange}
          loading={loadingTrends}
        />
      </div>
    );
    return overview;
  };

  const renderAllocationContent = (scheme: AnalysisSchemeConfig): ReactNode => {
    const schemeAllocation = buildAllocationBySchemeWithLines(
      snapshot.lines,
      scheme.schemeCode,
      scheme.schemeName,
    );
    const targets = allocationsByScheme[scheme.schemeCode] ?? [];
    const rebalanceResult = buildAllocationRebalanceDisplayRows({
      schemeAllocation,
      targets,
      depositMinor,
      mode,
      classificationSchemes,
    });
    const hasUncovered = schemeAllocation.totalMarketValueMinor < totalValue;
    const rebalanceDescription = hasUncovered
      ? "未分類の銘柄は売買対象外です。目標はタグ付き銘柄内で100%に正規化して試算しています。構成単位の売買を、各構成内の現状比率で銘柄に按分して表示します。"
      : "構成単位の売買を、各構成内の現状比率で銘柄に按分して表示します。";
    const classificationValues =
      classificationSchemes.find((item) => item.code === scheme.schemeCode)?.values ?? [];

    let content = (
      <div className="space-y-6">
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
      </div>
    );
    return content;
  };

  const renderSnapshotOverview = (scheme: AnalysisSchemeConfig): ReactNode => {
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

    let overview = (
      <AnalysisPanelSummary
        axisTotalMinor={schemeAllocation.totalMarketValueMinor}
        assetTotalMinor={totalValue}
        targetTotalRatio={targetTotalRatio}
      />
    );
    return overview;
  };

  const renderSnapshotContent = (scheme: AnalysisSchemeConfig): ReactNode => {
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
    const gapRows = buildAllocationGapRows(schemeAllocation.slices, targets);
    const slicesWithGap = mergeAllocationGapIntoSlices(
      schemeAllocation.slices,
      gapRows,
    );

    let content = (
      <AllocationSnapshotPanel
        slices={slicesWithGap}
        axisTotalMinor={schemeAllocation.totalMarketValueMinor}
        assetTotalMinor={totalValue}
        targetTotalRatio={targetTotalRatio}
        portfolioCode={portfolioCode}
        schemeCode={scheme.schemeCode}
        asOfDate={asOfDate}
      />
    );
    return content;
  };

  result = (
    <PageContainer>
      <Tabs
        value={mainView}
        onValueChange={(value) => {
          setMainView(value as AnalysisMainView);
        }}
      >
        <AnalysisViewControls
          schemes={schemeConfigs}
          activeSchemeCode={activeSchemeCode}
          onSchemeChange={setActiveSchemeCode}
        />
        <TabsContent value="trends" className="mt-4">
          <AnalysisTabPanel
            activeScheme={activeScheme}
            renderOverview={(scheme) => {
              if (!trendPeriodSummaryData) {
                let emptyOverview: ReactNode = null;
                return emptyOverview;
              }

              const schemePeriodShareChange = resolveSchemePeriodShareChange(
                scheme.schemeCode,
                displayTrendPoints,
                baselinePoint,
                trendDisplayUnit,
              );

              let overview = (
                <TrendPeriodSummary
                  startDateLabel={trendPeriodSummaryData.startDateLabel}
                  endDateLabel={trendPeriodSummaryData.endDateLabel}
                  startMarketValueMinor={trendPeriodSummaryData.startMarketValueMinor}
                  endMarketValueMinor={trendPeriodSummaryData.endMarketValueMinor}
                  metricDeltas={trendPeriodSummaryData.metricDeltas}
                  largestShareChange={schemePeriodShareChange}
                  sparseDataNote={trendPeriodSummaryData.sparseDataNote}
                  singleBucketNote={trendPeriodSummaryData.singleBucketNote}
                  baselineSummary={trendPeriodSummaryData.baselineSummary}
                />
              );
              return overview;
            }}
            renderContent={() => (
              <TrendsDetailPanel
                portfolioCode={portfolioCode}
                mode="allocation"
                hideSchemeTabs
                renderPeriodSummary={false}
              />
            )}
          />
        </TabsContent>
        <TabsContent value="allocation" className="mt-4">
          <AnalysisTabPanel
            activeScheme={activeScheme}
            renderOverview={renderAllocationOverview}
            renderContent={renderAllocationContent}
          />
        </TabsContent>
        <TabsContent value="snapshot" className="mt-4">
          <AnalysisTabPanel
            activeScheme={activeScheme}
            renderOverview={renderSnapshotOverview}
            renderContent={renderSnapshotContent}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
  return result;
}
