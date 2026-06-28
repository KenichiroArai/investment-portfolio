"use client";

import {
  filterHoldingDetailRows,
  findClassificationTagValue,
  flattenHoldingsInRange,
  paginateRows,
  sortHoldingDetailRows,
  type HoldingDetailSortColumn,
} from "@repo/shared";
import type { CurrentSnapshotDto } from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { HoldingsRangeDetailTable } from "@/features/holdings/HoldingsRangeDetailTable";
import {
  HOLDINGS_RANGE_DEFAULT_PAGE_SIZE,
  HoldingsRangeToolbar,
} from "@/features/holdings/HoldingsRangeToolbar";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getSnapshotByDateFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAsOfDateJa } from "@/lib/format-yen";

type AllocationDetailPanelProps = {
  portfolioCode: string;
  schemeCode: string;
  schemeName: string;
};

export function AllocationDetailPanel({
  portfolioCode,
  schemeCode,
  schemeName,
}: AllocationDetailPanelProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    isHistoricalView,
    periodBounds,
    rangeDates,
  } = usePortfolioTime();

  const [rangeSnapshots, setRangeSnapshots] = useState<CurrentSnapshotDto[]>([]);
  const [loadingRangeSnapshots, setLoadingRangeSnapshots] = useState(false);
  const [rangeFetchError, setRangeFetchError] = useState<string | null>(null);
  const [partialFetchWarning, setPartialFetchWarning] = useState<string | null>(
    null,
  );

  const [query, setQuery] = useState("");
  const [asOfDateFilter, setAsOfDateFilter] = useState("__all__");
  const [classificationValue, setClassificationValue] = useState("__all__");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(HOLDINGS_RANGE_DEFAULT_PAGE_SIZE);
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<HoldingDetailSortColumn>("asOfDate", "desc");

  const rangeDatesKey = rangeDates.join(",");
  const classificationSchemes = useMemo(
    () => [{ schemeCode, schemeName }],
    [schemeCode, schemeName],
  );

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadRangeSnapshots() {
      let loadResult: void = undefined;

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
  }, [portfolioCode, rangeDatesKey]);

  useEffect(() => {
    let result: void = undefined;
    setPage(1);
    return result;
  }, [
    query,
    asOfDateFilter,
    classificationValue,
    pageSize,
    rangeDatesKey,
    sortColumn,
    sortDirection,
    schemeCode,
  ]);

  useEffect(() => {
    let result: void = undefined;
    setClassificationValue("__all__");
    return result;
  }, [schemeCode]);

  const handleDetailSort = (column: HoldingDetailSortColumn): void => {
    let result: void = undefined;
    toggleSort(column);
    setPage(1);
    return result;
  };

  const allDetailRows = useMemo(() => {
    let result = flattenHoldingsInRange(rangeSnapshots);
    return result;
  }, [rangeSnapshots]);

  const classificationValues = useMemo(() => {
    let result: string[] = [];
    const values = new Set<string>();

    for (const row of allDetailRows) {
      const value = findClassificationTagValue(row.tags, schemeCode);
      if (value) {
        values.add(value);
      }
    }

    result = [...values].sort((left, right) => left.localeCompare(right, "ja"));
    return result;
  }, [allDetailRows, schemeCode]);

  const filteredDetailRows = useMemo(() => {
    let result = filterHoldingDetailRows(allDetailRows, {
      query,
      asOfDate: asOfDateFilter,
      classificationSchemeCode: schemeCode,
      classificationValue,
    });
    return result;
  }, [allDetailRows, query, asOfDateFilter, schemeCode, classificationValue]);

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

  const periodLabel =
    periodBounds !== null
      ? `${formatAsOfDateJa(periodBounds.from)} 〜 ${formatAsOfDateJa(periodBounds.to)}`
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
        <Badge variant="outline">全 {allDetailRows.length} 件</Badge>
        {isHistoricalView ? <Badge variant="secondary">履歴表示中</Badge> : null}
      </div>
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
                classificationSchemes={classificationSchemes}
                classificationSchemeCode={schemeCode}
                classificationValue={classificationValue}
                onClassificationSchemeChange={() => {}}
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
                hideSchemeSelector
                hideAnalysisLink
              />
              <HoldingsRangeDetailTable
                rows={paginatedDetailRows.pageRows}
                classificationSchemes={classificationSchemes}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleDetailSort}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
  return result;
}
