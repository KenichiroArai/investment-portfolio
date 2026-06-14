"use client";

import {
  buildAllocationBySchemeWithLines,
  buildAllocationGapRows,
  buildPortfolioAllocationRows,
  computeRebalanceTrades,
  resolveAnalysisSchemes,
  sumSnapshotMarketValue,
  type RebalanceMode,
} from "@repo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAllocationSchemeParam } from "@/features/allocation/useAllocationSchemeParam";
import { useTargetAllocations } from "@/features/allocation/useTargetAllocations";
import { useTargetPortfolioWeights } from "@/features/portfolio-allocation/useTargetPortfolioWeights";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import {
  RebalanceTable,
  type RebalanceDisplayRow,
} from "@/features/rebalance/RebalanceTable";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";

type RebalanceBasis = "portfolio" | "allocation";

type RebalanceViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function RebalanceView({ portfolioCode, portfolioKind }: RebalanceViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
  } = usePortfolioTime();
  const { allocationsByScheme, loading: loadingAllocations } =
    useTargetAllocations(portfolioCode);
  const { weights: portfolioWeights, loading: loadingPortfolioWeights } =
    useTargetPortfolioWeights(portfolioCode);

  const [basis, setBasis] = useState<RebalanceBasis>("portfolio");
  const [depositInput, setDepositInput] = useState("0");

  const schemeConfigs = useMemo(() => {
    let result = snapshot ? resolveAnalysisSchemes(snapshot, portfolioKind) : [];
    return result;
  }, [snapshot, portfolioKind]);
  const schemeCodes = schemeConfigs.map((config) => config.schemeCode);
  const { activeSchemeCode, setActiveSchemeCode } = useAllocationSchemeParam({
    schemeCodes,
  });

  const depositMinor = useMemo(() => {
    let result = 0;
    const parsed = Number.parseInt(depositInput.replace(/,/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      result = parsed;
    }
    return result;
  }, [depositInput]);

  const mode: RebalanceMode = depositMinor > 0 ? "deposit_only" : "full";

  const rebalanceResult = useMemo(() => {
    let result = {
      rows: [] as RebalanceDisplayRow[],
      totalBuyMinor: 0,
      totalSellMinor: 0,
      unallocatedDepositMinor: 0,
    };

    if (!snapshot) {
      return result;
    }

    const totalValue = sumSnapshotMarketValue(snapshot.lines);

    if (basis === "portfolio") {
      const allocationRows = buildPortfolioAllocationRows(
        snapshot.lines,
        portfolioWeights,
        totalValue,
      );
      const trades = computeRebalanceTrades({
        rows: allocationRows.map((row) => ({
          key: row.instrumentId,
          marketValueMinor: row.marketValueMinor,
          targetRatio: row.targetRatio,
        })),
        depositMinor,
        mode,
      });

      result = {
        ...trades,
        rows: trades.rows.map((row) => {
          const source = allocationRows.find((item) => item.instrumentId === row.key);
          let displayRow: RebalanceDisplayRow = {
            ...row,
            label: source?.instrumentName ?? row.key,
            marketValueMinor: source?.marketValueMinor ?? 0,
          };
          return displayRow;
        }),
      };
      return result;
    }

    if (activeSchemeCode === "") {
      return result;
    }

    const scheme = schemeConfigs.find((item) => item.schemeCode === activeSchemeCode);
    if (!scheme) {
      return result;
    }

    const schemeAllocation = buildAllocationBySchemeWithLines(
      snapshot.lines,
      scheme.schemeCode,
      scheme.schemeName,
    );
    const targets = allocationsByScheme[scheme.schemeCode] ?? [];
    const gapRows = buildAllocationGapRows(
      schemeAllocation.slices,
      targets,
      totalValue,
    );

    const trades = computeRebalanceTrades({
      rows: schemeAllocation.slices.map((slice) => ({
        key: slice.valueCode,
        marketValueMinor: slice.marketValueMinor,
        targetRatio: gapRows.find((gap) => gap.valueCode === slice.valueCode)?.targetRatio ?? null,
      })),
      depositMinor,
      mode,
    });

    result = {
      ...trades,
      rows: trades.rows.map((row) => {
        const source = schemeAllocation.slices.find((slice) => slice.valueCode === row.key);
        let displayRow: RebalanceDisplayRow = {
          ...row,
          label: source?.valueName ?? row.key,
          marketValueMinor: source?.marketValueMinor ?? 0,
        };
        return displayRow;
      }),
    };
    return result;
  }, [
    activeSchemeCode,
    allocationsByScheme,
    basis,
    depositMinor,
    mode,
    portfolioWeights,
    schemeConfigs,
    snapshot,
  ]);

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot || loadingAllocations || loadingPortfolioWeights) {
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
        <PageHeader title="リバランス" />
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
        <PageHeader title="リバランス" />
        <Alert variant="destructive">
          <AlertDescription>リバランスの対象となる明細がありません。</AlertDescription>
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
        title="リバランス"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatAsOfDateJa(asOfDate)}</Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴</Badge> : null}
          </div>
        }
      />

      <div className="mb-4">
        <p className="text-sm font-medium">評価額合計: {formatYen(totalValue)}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">リバランス設定</CardTitle>
            <CardDescription>
              目標配分との差に基づき、売買金額の目安を計算します（口数の丸めは行いません）。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField label="対象" htmlFor="rebalance-basis-portfolio">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="rebalance-basis-portfolio"
                    type="radio"
                    name="rebalance-basis"
                    value="portfolio"
                    checked={basis === "portfolio"}
                    onChange={() => {
                      setBasis("portfolio");
                    }}
                    aria-label="銘柄（ポートフォリオ）"
                  />
                  <Label htmlFor="rebalance-basis-portfolio">銘柄（ポートフォリオ）</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="rebalance-basis-allocation"
                    type="radio"
                    name="rebalance-basis"
                    value="allocation"
                    checked={basis === "allocation"}
                    onChange={() => {
                      setBasis("allocation");
                    }}
                    aria-label="構成（アセットロケーション）"
                  />
                  <Label htmlFor="rebalance-basis-allocation">構成（アセットロケーション）</Label>
                </div>
              </div>
            </FormField>

            {basis === "allocation" ? (
              <FormField label="分析軸" htmlFor="rebalance-scheme">
                <Select
                  value={activeSchemeCode}
                  onValueChange={(value) => {
                    setActiveSchemeCode(value);
                  }}
                >
                  <SelectTrigger id="rebalance-scheme">
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
            ) : null}

            <FormField label="入金額（円）" htmlFor="rebalance-deposit">
              <Input
                id="rebalance-deposit"
                type="number"
                min={0}
                step={1000}
                value={depositInput}
                onChange={(event) => {
                  setDepositInput(event.target.value);
                }}
                aria-describedby="rebalance-deposit-hint"
              />
              <p id="rebalance-deposit-hint" className="text-sm text-muted-foreground">
                0 のときは総額を変えずフルリバランス（売買あり）を計算します。
              </p>
            </FormField>

            <FormField label="方式" htmlFor="rebalance-mode-full">
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="rebalance-mode-full"
                    type="radio"
                    name="rebalance-mode"
                    value="full"
                    checked={mode === "full"}
                    disabled={depositMinor > 0}
                    readOnly
                    aria-label="フルリバランス（売買あり）"
                  />
                  <Label htmlFor="rebalance-mode-full">フルリバランス（売買あり）</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="rebalance-mode-deposit-only"
                    type="radio"
                    name="rebalance-mode"
                    value="deposit_only"
                    checked={mode === "deposit_only"}
                    disabled={depositMinor <= 0}
                    readOnly
                    aria-label="入金のみ（買い増しのみ）"
                  />
                  <Label htmlFor="rebalance-mode-deposit-only">入金のみ（買い増しのみ）</Label>
                </div>
              </div>
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">売買提案</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RebalanceTable rows={rebalanceResult.rows} />
            <div className="flex flex-wrap gap-4 text-sm">
              <span>合計買い: {formatYen(rebalanceResult.totalBuyMinor)}</span>
              <span>合計売り: {formatYen(rebalanceResult.totalSellMinor)}</span>
              {rebalanceResult.unallocatedDepositMinor > 0 ? (
                <span className="text-muted-foreground">
                  未配分入金: {formatYen(rebalanceResult.unallocatedDepositMinor)}
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
  return result;
}
