"use client";

import {
  buildPortfolioAllocationRows,
  sumSnapshotMarketValue,
} from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { FormField } from "@/components/form-field";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
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
import { RebalanceSettingsCard } from "@/features/allocation/RebalanceSettingsCard";
import { RebalanceTradesSummary } from "@/features/allocation/RebalanceTradesSummary";
import { useAllocationSchemeParam } from "@/features/allocation/useAllocationSchemeParam";
import { useRebalanceDeposit } from "@/features/allocation/useRebalanceDeposit";
import { useTargetAllocations } from "@/features/allocation/useTargetAllocations";
import { ImpliedAllocationTargetsCard } from "@/features/portfolio-allocation/ImpliedAllocationTargetsCard";
import { PortfolioAllocationPanel } from "@/features/portfolio-allocation/PortfolioAllocationPanel";
import { TargetPortfolioSettingsCard } from "@/features/portfolio-allocation/TargetPortfolioSettingsCard";
import {
  useImpliedAllocationRows,
  usePortfolioAnalysisSchemes,
  usePortfolioRebalanceResult,
} from "@/features/portfolio-allocation/usePortfolioRebalanceResult";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
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
  } = usePortfolioTime();
  const { weights, loading: loadingWeights } = useTargetPortfolioWeights(portfolioCode);
  const { allocationsByScheme, loading: loadingAllocations } =
    useTargetAllocations(portfolioCode);
  const { depositInput, setDepositInput, depositMinor, mode } = useRebalanceDeposit();

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

  const impliedAllocationRows = useImpliedAllocationRows(
    snapshot?.lines ?? [],
    weights,
    activeSchemeCode,
  );

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
                impliedRows={impliedAllocationRows}
                allocationTargets={allocationTargetsForScheme}
                schemeName={activeScheme.schemeName}
              />
            ) : null}
          </>
        ) : null}

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
    </PageContainer>
  );
  return result;
}
