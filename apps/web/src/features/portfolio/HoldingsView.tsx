"use client";

import {
  buildHoldingPeriodChangeRows,
  collectHoldingsClassificationSchemes,
  resolveComparisonDate,
  type HoldingComparisonMode,
} from "@repo/shared";
import type { CurrentSnapshotDto } from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HoldingsPeriodDetailTable } from "@/features/holdings/HoldingsPeriodDetailTable";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getSnapshotByDateFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";
import { formatAsOfDateJa } from "@/lib/format-yen";

type HoldingsViewProps = {
  portfolioCode: string;
};

const COMPARISON_MODE_LABELS: Record<HoldingComparisonMode, string> = {
  periodStart: "期間開始比",
  previousSnapshot: "前回比",
};

export function HoldingsView({ portfolioCode }: HoldingsViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
    periodBounds,
    rangeDates,
    availableDates,
  } = usePortfolioTime();

  const [comparisonMode, setComparisonMode] =
    useState<HoldingComparisonMode>("periodStart");
  const [baselineSnapshot, setBaselineSnapshot] =
    useState<CurrentSnapshotDto | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);

  const comparisonDate = useMemo(() => {
    let result = resolveComparisonDate(
      comparisonMode,
      selectedAsOfDate,
      availableDates,
      rangeDates,
    );
    return result;
  }, [comparisonMode, selectedAsOfDate, availableDates, rangeDates]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadBaseline() {
      let loadResult: void = undefined;

      if (!comparisonDate) {
        setBaselineSnapshot(null);
        setBaselineError(null);
        setLoadingBaseline(false);
        return loadResult;
      }

      setLoadingBaseline(true);
      setBaselineError(null);

      try {
        const response = await fetch(
          getSnapshotByDateFetchUrl(portfolioCode, comparisonDate),
        );
        if (cancelled) {
          return loadResult;
        }
        if (!response.ok) {
          setBaselineSnapshot(null);
          setBaselineError("比較元データの取得に失敗しました。");
          return loadResult;
        }
        const data = (await response.json()) as CurrentSnapshotDto;
        setBaselineSnapshot(data);
      } catch {
        if (!cancelled) {
          setBaselineSnapshot(null);
          setBaselineError(getSnapshotLoadErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setLoadingBaseline(false);
        }
      }

      return loadResult;
    }

    void loadBaseline();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, comparisonDate]);

  const changeRows = useMemo(() => {
    let result = buildHoldingPeriodChangeRows(
      snapshot?.lines ?? [],
      baselineSnapshot?.lines ?? null,
    );
    return result;
  }, [snapshot, baselineSnapshot]);

  const classificationSchemes = useMemo(() => {
    let result = collectHoldingsClassificationSchemes(
      snapshot?.analysisSchemes ?? [],
      snapshot?.lines ?? [],
    );
    return result;
  }, [snapshot]);

  const showDeltas = comparisonDate !== null && baselineSnapshot !== null;
  const periodLabel =
    periodBounds !== null
      ? `${formatAsOfDateJa(periodBounds.from)} 〜 ${formatAsOfDateJa(periodBounds.to)}`
      : null;
  const comparisonCaption =
    comparisonDate && selectedAsOfDate
      ? `${formatAsOfDateJa(comparisonDate)} → ${formatAsOfDateJa(selectedAsOfDate)}`
      : null;

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot) {
    result = (
      <PageContainer>
        <LoadingSkeleton variant="table" />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title="保有明細" description={portfolioCode} />
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
        <PageHeader title="保有明細" description={portfolioCode} />
        <Alert variant="destructive">
          <AlertDescription>明細がまだ登録されていません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  result = (
    <PageContainer>
      <PageHeader
        title="保有明細"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {periodLabel ? (
              <Badge variant="outline">期間: {periodLabel}</Badge>
            ) : null}
            <Badge variant="outline">
              基準日: {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
            </Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴表示中</Badge> : null}
          </div>
        }
      />
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(COMPARISON_MODE_LABELS) as HoldingComparisonMode[]).map(
            (mode) => {
              let button = (
                <Button
                  key={mode}
                  type="button"
                  size="sm"
                  variant={comparisonMode === mode ? "default" : "outline"}
                  onClick={() => {
                    setComparisonMode(mode);
                  }}
                >
                  {COMPARISON_MODE_LABELS[mode]}
                </Button>
              );
              return button;
            },
          )}
        </div>
        {comparisonCaption ? (
          <p className="text-sm text-muted-foreground">比較: {comparisonCaption}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {comparisonMode === "previousSnapshot"
              ? "前回の基準日がないため、増減を表示できません。"
              : "期間開始日と基準日が同じため、増減を表示できません。"}
          </p>
        )}
        {baselineError ? (
          <Alert variant="destructive">
            <AlertDescription>{baselineError}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <Card>
        <CardContent className="p-0 pt-4">
          {snapshot.lines.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              保有銘柄がありません。
            </p>
          ) : loadingBaseline && comparisonDate ? (
            <LoadingSkeleton variant="table" />
          ) : (
            <HoldingsPeriodDetailTable
              rows={changeRows}
              classificationSchemes={classificationSchemes}
              showDeltas={showDeltas}
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
  return result;
}
