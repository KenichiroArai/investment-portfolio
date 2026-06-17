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

import { AllocationCrossLink } from "@/features/allocation/AllocationCrossLink";
import { AllocationPeriodShareSummary } from "@/features/allocation/AllocationPeriodShareSummary";
import { AllocationSchemeTabs } from "@/features/allocation/AllocationSchemeTabs";
import { AllocationSnapshotPanel } from "@/features/allocation/AllocationSnapshotPanel";
import { buildAllocationRebalanceDisplayRows } from "@/features/allocation/build-allocation-rebalance-display-rows";
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { useAllocationSchemeParam } from "@/features/allocation/useAllocationSchemeParam";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { useTargetAllocations } from "@/features/allocation/useTargetAllocations";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { buildTrendChartBuckets } from "@/features/trends/trend-chart-buckets";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchClassificationSchemes } from "@/lib/api-client";
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
  } = usePortfolioTime();
  const { allocationsByScheme } = useTargetAllocations(portfolioCode);
  const { depositInput, setDepositInput, depositMinor, mode } = useRebalanceDeposit();
  const [classificationSchemes, setClassificationSchemes] = useState<
    ClassificationSchemeWithValuesDto[]
  >([]);
  const [loadingSchemes, setLoadingSchemes] = useState(true);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

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

  result = (
    <PageContainer>
      <PageHeader
        title="資産配分"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatAsOfDateJa(asOfDate)}</Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴</Badge> : null}
            <Button variant="outline" size="sm" asChild>
              <Link href={buildPortfolioPath(portfolioCode, "settings", "classification")}>
                <Settings className="h-4 w-4" />
                分類設定
              </Link>
            </Button>
          </div>
        }
      />
      <div className="mb-4 space-y-3">
        <p className="text-sm font-medium">評価額合計: {formatYen(totalValue)}</p>
        <AllocationPeriodShareSummary
          largestShareChange={periodShareChange}
          loading={loadingTrends}
        />
        <AllocationCrossLink
          portfolioCode={portfolioCode}
          target="trends"
          schemeCode={activeSchemeCode}
          metric="allocation"
          label="この軸の推移を見る"
        />
      </div>

      <div className="space-y-6">
        <RebalanceSettingsCard
          depositInput={depositInput}
          depositMinor={depositMinor}
          mode={mode}
          onDepositInputChange={setDepositInput}
          depositInputId="analysis-rebalance-deposit"
        />

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
              portfolioTotalMinor: totalValue,
              depositMinor,
              mode,
              classificationSchemes,
            });

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

                <RebalanceTradesSummary
                  description="構成単位の売買を、各構成内の現状比率で銘柄に按分して表示します。"
                  rows={rebalanceResult.rows}
                  totalBuyMinor={rebalanceResult.totalBuyMinor}
                  totalSellMinor={rebalanceResult.totalSellMinor}
                  unallocatedDepositMinor={rebalanceResult.unallocatedDepositMinor}
                  grouped
                />
              </div>
            );
            return panel;
          }}
        />
      </div>
    </PageContainer>
  );
  return result;
}
