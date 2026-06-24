"use client";

import {
  buildHoldingPeriodChangeRows,
  collectHoldingsClassificationSchemes,
  filterHoldingDetailRows,
  findClassificationTagValue,
  flattenHoldingsInRange,
  paginateRows,
  resolveComparisonDate,
  sortHoldingDetailRows,
  type HoldingComparisonMode,
  type HoldingDetailSortColumn,
} from "@repo/shared";
import type { CurrentSnapshotDto } from "@repo/shared";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HoldingsPeriodDetailTable } from "@/features/holdings/HoldingsPeriodDetailTable";
import { HoldingsRangeDetailTable } from "@/features/holdings/HoldingsRangeDetailTable";
import {
  HOLDINGS_RANGE_DEFAULT_PAGE_SIZE,
  HoldingsRangeToolbar,
} from "@/features/holdings/HoldingsRangeToolbar";
import type { HoldingsMode } from "@/features/portfolio/usePortfolioSubviewParam";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSnapshotByDateFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAsOfDateJa } from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type HoldingsDetailPanelProps = {
  portfolioCode: string;
  holdingsMode: HoldingsMode;
  onHoldingsModeChange: (mode: HoldingsMode) => void;
};

const COMPARISON_MODE_LABELS: Record<HoldingComparisonMode, string> = {
  periodStart: "期間開始比",
  previousSnapshot: "前回比",
};

const HOLDINGS_MODE_LABELS: Record<HoldingsMode, string> = {
  range: "期間明細一覧",
  compare: "スナップショット比較",
};

export function HoldingsDetailPanel({
  portfolioCode,
  holdingsMode,
  onHoldingsModeChange,
}: HoldingsDetailPanelProps) {
  const searchParams = useSearchParams();
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

  const [rangeSnapshots, setRangeSnapshots] = useState<CurrentSnapshotDto[]>([]);
  const [loadingRangeSnapshots, setLoadingRangeSnapshots] = useState(false);
  const [rangeFetchError, setRangeFetchError] = useState<string | null>(null);
  const [partialFetchWarning, setPartialFetchWarning] = useState<string | null>(
    null,
  );

  const [query, setQuery] = useState("");
  const [asOfDateFilter, setAsOfDateFilter] = useState(() => {
    let result = "__all__";
    const asOf = searchParams.get("asOf");
    const hasClassificationDeepLink =
      searchParams.get("scheme") !== null || searchParams.get("value") !== null;

    if (asOf && hasClassificationDeepLink) {
      result = asOf;
    }

    return result;
  });
  const [classificationSchemeCode, setClassificationSchemeCode] = useState(() => {
    let result = "";
    const scheme = searchParams.get("scheme");
    if (scheme) {
      result = scheme;
    }
    return result;
  });
  const [classificationValue, setClassificationValue] = useState(() => {
    let result = "__all__";
    const value = searchParams.get("value");
    if (value) {
      result = value;
    }
    return result;
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(HOLDINGS_RANGE_DEFAULT_PAGE_SIZE);
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<HoldingDetailSortColumn>("asOfDate", "desc");

  const rangeDatesKey = rangeDates.join(",");

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

      if (holdingsMode !== "compare") {
        setBaselineSnapshot(null);
        setBaselineError(null);
        setLoadingBaseline(false);
        return loadResult;
      }

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
  }, [portfolioCode, comparisonDate, holdingsMode]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadRangeSnapshots() {
      let loadResult: void = undefined;

      if (holdingsMode !== "range") {
        setLoadingRangeSnapshots(false);
        return loadResult;
      }

      if (rangeDates.length === 0) {
        setRangeSnapshots([]);
        setRangeFetchError(null);
        setPartialFetchWarning(null);
        setLoadingRangeSnapshots(false);
        return loadResult;
      }

      setLoadingRangeSnapshots(true);
      setRangeFetchError(null);
      setPartialFetchWarning(null);

      const fetchResults = await Promise.all(
        rangeDates.map(async (asOfDate) => {
          let snapshotResult: CurrentSnapshotDto | null = null;

          try {
            const response = await fetch(
              getSnapshotByDateFetchUrl(portfolioCode, asOfDate),
            );
            if (!response.ok) {
              return { asOfDate, snapshot: snapshotResult };
            }
            snapshotResult = (await response.json()) as CurrentSnapshotDto;
          } catch {
            snapshotResult = null;
          }

          return { asOfDate, snapshot: snapshotResult };
        }),
      );

      if (cancelled) {
        return loadResult;
      }

      const failedDates = fetchResults
        .filter((item) => item.snapshot === null)
        .map((item) => item.asOfDate);
      const snapshots = fetchResults
        .filter((item) => item.snapshot !== null)
        .map((item) => item.snapshot as CurrentSnapshotDto);

      if (snapshots.length === 0) {
        setRangeSnapshots([]);
        setRangeFetchError(getSnapshotLoadErrorMessage());
        setLoadingRangeSnapshots(false);
        return loadResult;
      }

      if (failedDates.length > 0) {
        setPartialFetchWarning(
          `${failedDates.length} 基準日の取得に失敗しました。取得できた ${snapshots.length} 基準日分を表示しています。`,
        );
      }

      setRangeSnapshots(snapshots);
      setLoadingRangeSnapshots(false);
      return loadResult;
    }

    void loadRangeSnapshots();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, rangeDatesKey, holdingsMode]);

  useEffect(() => {
    let result: void = undefined;
    setPage(1);
    return result;
  }, [
    query,
    asOfDateFilter,
    classificationSchemeCode,
    classificationValue,
    pageSize,
    rangeDatesKey,
    sortColumn,
    sortDirection,
  ]);

  const handleDetailSort = (column: HoldingDetailSortColumn): void => {
    let result: void = undefined;
    toggleSort(column);
    setPage(1);
    return result;
  };

  const changeRows = useMemo(() => {
    let result = buildHoldingPeriodChangeRows(
      snapshot?.lines ?? [],
      baselineSnapshot?.lines ?? null,
    );
    return result;
  }, [snapshot, baselineSnapshot]);

  const compareClassificationSchemes = useMemo(() => {
    let result = collectHoldingsClassificationSchemes(
      snapshot?.analysisSchemes ?? [],
      snapshot?.lines ?? [],
    );
    return result;
  }, [snapshot]);

  const allDetailRows = useMemo(() => {
    let result = flattenHoldingsInRange(rangeSnapshots);
    return result;
  }, [rangeSnapshots]);

  const rangeClassificationSchemes = useMemo(() => {
    let result = collectHoldingsClassificationSchemes(
      rangeSnapshots[0]?.analysisSchemes ?? snapshot?.analysisSchemes ?? [],
      allDetailRows.map((row) => ({
        id: `${row.asOfDate}:${row.instrumentId}`,
        instrumentId: row.instrumentId,
        instrumentName: row.instrumentName,
        sortOrder: row.sortOrder,
        quantity: row.quantity,
        marketValueMinor: row.marketValueMinor,
        bookValueMinor: row.bookValueMinor,
        metrics: [],
        instrumentAttributes: [],
        tags: row.tags,
      })),
    );
    return result;
  }, [allDetailRows, rangeSnapshots, snapshot]);

  useEffect(() => {
    let result: void = undefined;

    if (classificationSchemeCode !== "") {
      return result;
    }

    const firstScheme = rangeClassificationSchemes[0]?.schemeCode ?? "";
    if (firstScheme !== "") {
      setClassificationSchemeCode(firstScheme);
    }

    return result;
  }, [classificationSchemeCode, rangeClassificationSchemes]);

  const classificationValues = useMemo(() => {
    let result: string[] = [];

    if (classificationSchemeCode === "") {
      return result;
    }

    const values = new Set<string>();
    for (const row of allDetailRows) {
      const value = findClassificationTagValue(row.tags, classificationSchemeCode);
      if (value) {
        values.add(value);
      }
    }

    result = [...values].sort((left, right) => left.localeCompare(right, "ja"));
    return result;
  }, [allDetailRows, classificationSchemeCode]);

  const filteredDetailRows = useMemo(() => {
    let result = filterHoldingDetailRows(allDetailRows, {
      query,
      asOfDate: asOfDateFilter,
      classificationSchemeCode,
      classificationValue,
    });
    return result;
  }, [
    allDetailRows,
    query,
    asOfDateFilter,
    classificationSchemeCode,
    classificationValue,
  ]);

  const sortedDetailRows = useMemo(() => {
    let result = sortHoldingDetailRows(
      filteredDetailRows,
      sortColumn,
      sortDirection,
    );
    return result;
  }, [filteredDetailRows, sortColumn, sortDirection]);

  const paginatedDetailRows = useMemo(() => {
    let result = paginateRows(sortedDetailRows, page, pageSize);
    return result;
  }, [sortedDetailRows, page, pageSize]);

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
    result = <LoadingSkeleton variant="table" />;
    return result;
  }

  if (error) {
    result = (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
    return result;
  }

  if (!snapshot) {
    result = (
      <Alert variant="destructive">
        <AlertDescription>明細がまだ登録されていません。</AlertDescription>
      </Alert>
    );
    return result;
  }

  result = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {periodLabel ? (
          <Badge variant="outline">期間: {periodLabel}</Badge>
        ) : null}
        {holdingsMode === "range" ? (
          <Badge variant="outline">全 {allDetailRows.length} 件</Badge>
        ) : (
          <Badge variant="outline">
            基準日: {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
          </Badge>
        )}
        {isHistoricalView ? <Badge variant="secondary">履歴表示中</Badge> : null}
      </div>
      <Tabs
        value={holdingsMode}
        onValueChange={(value) => {
          onHoldingsModeChange(value as HoldingsMode);
        }}
      >
        <TabsList>
          {(Object.keys(HOLDINGS_MODE_LABELS) as HoldingsMode[]).map((mode) => {
            let trigger = (
              <TabsTrigger key={mode} value={mode}>
                {HOLDINGS_MODE_LABELS[mode]}
              </TabsTrigger>
            );
            return trigger;
          })}
        </TabsList>
        <TabsContent value="range">
          <Card>
            <CardContent className="p-0 pt-4">
              {loadingRangeSnapshots ? (
                <LoadingSkeleton variant="table" />
              ) : rangeFetchError ? (
                <Alert variant="destructive" className="m-4">
                  <AlertDescription>{rangeFetchError}</AlertDescription>
                </Alert>
              ) : allDetailRows.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  期間内の明細がありません。
                </p>
              ) : (
                <>
                  {partialFetchWarning ? (
                    <Alert className="mx-4 mb-2">
                      <AlertDescription>{partialFetchWarning}</AlertDescription>
                    </Alert>
                  ) : null}
                  <HoldingsRangeToolbar
                    query={query}
                    onQueryChange={setQuery}
                    asOfDateFilter={asOfDateFilter}
                    onAsOfDateFilterChange={setAsOfDateFilter}
                    availableDates={rangeDates}
                    classificationSchemes={rangeClassificationSchemes}
                    classificationSchemeCode={classificationSchemeCode}
                    classificationValue={classificationValue}
                    onClassificationSchemeChange={(value) => {
                      setClassificationSchemeCode(value);
                      setClassificationValue("__all__");
                    }}
                    onClassificationValueChange={setClassificationValue}
                    classificationValues={classificationValues}
                    page={paginatedDetailRows.page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(value) => {
                      setPageSize(value);
                    }}
                    totalPages={paginatedDetailRows.totalPages}
                    rangeLabel={paginatedDetailRows.rangeLabel}
                    portfolioCode={portfolioCode}
                    analysisHref={
                      classificationSchemeCode !== ""
                        ? `${buildPortfolioPath(portfolioCode, "analysis")}?scheme=${encodeURIComponent(classificationSchemeCode)}`
                        : buildPortfolioPath(portfolioCode, "analysis")
                    }
                  />
                  <HoldingsRangeDetailTable
                    rows={paginatedDetailRows.pageRows}
                    classificationSchemes={rangeClassificationSchemes}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleDetailSort}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="compare">
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
                  classificationSchemes={compareClassificationSchemes}
                  showDeltas={showDeltas}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  return result;
}
