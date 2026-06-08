"use client";

import {
  aggregateTrendPoints,
  resolveDateRange,
  resolveLatestSnapshotDate,
  resolveTrendDisplayUnit,
  TREND_DISPLAY_UNIT_LABELS,
  type AggregatedTrendPoint,
  type CurrentSnapshotDto,
  type SnapshotDateListDto,
  type SnapshotPeriodPreset,
  type SnapshotTrendsDto,
  type TrendDisplayUnit,
} from "@repo/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getSnapshotByDateFetchUrl,
  getSnapshotDatesFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  getSnapshotTrendsFetchUrl,
} from "@/lib/data-source";

type PortfolioTimeContextValue = {
  portfolioCode: string;
  availableDates: string[];
  currentAsOfDate: string | null;
  selectedAsOfDate: string | null;
  setSelectedAsOfDate: (asOfDate: string) => void;
  jumpToLatest: () => void;
  periodPreset: SnapshotPeriodPreset;
  setPeriodPreset: (preset: SnapshotPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  calendarMonth: string;
  setCalendarMonth: (value: string) => void;
  rangeDates: string[];
  snapshot: CurrentSnapshotDto | null;
  trends: SnapshotTrendsDto | null;
  trendDisplayUnit: TrendDisplayUnit;
  trendDisplayUnitLabel: string;
  displayTrendPoints: AggregatedTrendPoint[];
  loadingDates: boolean;
  loadingSnapshot: boolean;
  loadingTrends: boolean;
  error: string | null;
  isHistoricalView: boolean;
  emphasizeAsOf: boolean;
  emphasizePeriod: boolean;
};

const PortfolioTimeContext = createContext<PortfolioTimeContextValue | null>(null);

type PortfolioTimeProviderProps = {
  portfolioCode: string;
  children: ReactNode;
};

function readPeriodPreset(value: string | null): SnapshotPeriodPreset {
  let result: SnapshotPeriodPreset = "all";
  if (
    value === "1w" ||
    value === "1m" ||
    value === "3m" ||
    value === "6m" ||
    value === "12m" ||
    value === "all"
  ) {
    result = value;
    return result;
  }
  return result;
}

export function PortfolioTimeProvider({
  portfolioCode,
  children,
}: PortfolioTimeProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentAsOfDate, setCurrentAsOfDate] = useState<string | null>(null);
  const [selectedAsOfDate, setSelectedAsOfDateState] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [trends, setTrends] = useState<SnapshotTrendsDto | null>(null);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const periodPreset = readPeriodPreset(searchParams.get("period"));
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const calendarMonth = searchParams.get("month") ?? "";

  const emphasizeAsOf = !pathname.includes("/trends");
  const emphasizePeriod = pathname.includes("/trends") || pathname.endsWith(`/portfolios/${portfolioCode}/`) || pathname.endsWith(`/portfolios/${portfolioCode}`);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      let result: void = undefined;
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`);
      return result;
    },
    [pathname, router, searchParams],
  );

  const setSelectedAsOfDate = useCallback(
    (asOfDate: string) => {
      let result: void = undefined;
      setSelectedAsOfDateState(asOfDate);
      updateSearchParams({ asOf: asOfDate });
      return result;
    },
    [updateSearchParams],
  );

  const jumpToLatest = useCallback(() => {
    let result: void = undefined;
    const latest = resolveLatestSnapshotDate(availableDates);
    if (!latest) {
      return result;
    }
    setSelectedAsOfDate(latest);
    return result;
  }, [availableDates, setSelectedAsOfDate]);

  const setPeriodPreset = useCallback(
    (preset: SnapshotPeriodPreset) => {
      let result: void = undefined;
      updateSearchParams({
        period: preset === "all" ? null : preset,
        from: null,
        to: null,
        month: null,
      });
      return result;
    },
    [updateSearchParams],
  );

  const setCustomFrom = useCallback(
    (value: string) => {
      let result: void = undefined;
      updateSearchParams({
        from: value || null,
        period: null,
        month: null,
      });
      return result;
    },
    [updateSearchParams],
  );

  const setCustomTo = useCallback(
    (value: string) => {
      let result: void = undefined;
      updateSearchParams({
        to: value || null,
        period: null,
        month: null,
      });
      return result;
    },
    [updateSearchParams],
  );

  const setCalendarMonth = useCallback(
    (value: string) => {
      let result: void = undefined;
      updateSearchParams({
        month: value || null,
        period: null,
        from: null,
        to: null,
      });
      return result;
    },
    [updateSearchParams],
  );

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadDates() {
      let loadResult: void = undefined;
      setLoadingDates(true);
      setError(null);

      try {
        const response = await fetch(getSnapshotDatesFetchUrl(portfolioCode));
        if (cancelled) {
          return loadResult;
        }
        if (response.status === 404) {
          setAvailableDates([]);
          setCurrentAsOfDate(null);
          return loadResult;
        }
        if (!response.ok) {
          setError("基準日一覧の取得に失敗しました。");
          return loadResult;
        }
        const data = (await response.json()) as SnapshotDateListDto;
        const sorted = [...data.dates]
          .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate))
          .map((item) => item.asOfDate);
        const current = data.dates.find((item) => item.isCurrent)?.asOfDate ?? sorted[sorted.length - 1] ?? null;
        setAvailableDates(sorted);
        setCurrentAsOfDate(current);
      } catch {
        if (!cancelled) {
          setError(getSnapshotLoadErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setLoadingDates(false);
        }
      }

      return loadResult;
    }

    void loadDates();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode]);

  useEffect(() => {
    let result: void = undefined;

    if (availableDates.length === 0) {
      setSelectedAsOfDateState(null);
      return result;
    }

    const fromUrl = searchParams.get("asOf");
    const latest = resolveLatestSnapshotDate(availableDates);
    const customEnd = customTo || latest;
    const initial =
      fromUrl && availableDates.includes(fromUrl)
        ? fromUrl
        : customEnd && availableDates.includes(customEnd)
          ? customEnd
          : latest;

    if (initial && initial !== selectedAsOfDate) {
      setSelectedAsOfDateState(initial);
      if (fromUrl !== initial) {
        updateSearchParams({ asOf: initial });
      }
    }

    return result;
  }, [availableDates, customTo, searchParams, selectedAsOfDate, updateSearchParams]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadSnapshot() {
      let loadResult: void = undefined;
      if (!selectedAsOfDate) {
        setSnapshot(null);
        setLoadingSnapshot(false);
        return loadResult;
      }

      setLoadingSnapshot(true);
      try {
        const url =
          selectedAsOfDate === currentAsOfDate
            ? getSnapshotFetchUrl(portfolioCode)
            : getSnapshotByDateFetchUrl(portfolioCode, selectedAsOfDate);
        const response = await fetch(url);
        if (cancelled) {
          return loadResult;
        }
        if (!response.ok) {
          setSnapshot(null);
          if (!cancelled) {
            setError("データの取得に失敗しました。");
          }
          return loadResult;
        }
        const data = (await response.json()) as CurrentSnapshotDto;
        setSnapshot(data);
      } catch {
        if (!cancelled) {
          setSnapshot(null);
          setError(getSnapshotLoadErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setLoadingSnapshot(false);
        }
      }

      return loadResult;
    }

    void loadSnapshot();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, selectedAsOfDate, currentAsOfDate]);

  const rangeDates = useMemo(() => {
    let result = resolveDateRange({
      availableDates,
      preset: periodPreset,
      customFrom: customFrom || null,
      customTo: customTo || null,
      calendarMonth: calendarMonth || null,
    });
    return result;
  }, [availableDates, periodPreset, customFrom, customTo, calendarMonth]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadTrends() {
      let loadResult: void = undefined;
      if (rangeDates.length === 0) {
        setTrends(null);
        setLoadingTrends(false);
        return loadResult;
      }

      setLoadingTrends(true);
      const from = rangeDates[0];
      const to = rangeDates[rangeDates.length - 1];

      try {
        const response = await fetch(getSnapshotTrendsFetchUrl(portfolioCode, from, to));
        if (cancelled) {
          return loadResult;
        }
        if (!response.ok) {
          setTrends(null);
          return loadResult;
        }
        const data = (await response.json()) as SnapshotTrendsDto;
        const filteredPoints = data.points.filter(
          (point) => point.asOfDate >= from && point.asOfDate <= to,
        );
        setTrends({
          portfolioCode: data.portfolioCode,
          from,
          to,
          points: filteredPoints,
        });
      } catch {
        if (!cancelled) {
          setTrends(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingTrends(false);
        }
      }

      return loadResult;
    }

    void loadTrends();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, rangeDates]);

  const trendDisplayUnit = resolveTrendDisplayUnit(periodPreset);
  const displayTrendPoints = useMemo(() => {
    let result: AggregatedTrendPoint[] = [];
    if (!trends || trends.points.length === 0) {
      return result;
    }
    result = aggregateTrendPoints(trends.points, trendDisplayUnit);
    return result;
  }, [trends, trendDisplayUnit]);

  const value = useMemo(() => {
    let result: PortfolioTimeContextValue = {
      portfolioCode,
      availableDates,
      currentAsOfDate,
      selectedAsOfDate,
      setSelectedAsOfDate,
      jumpToLatest,
      periodPreset,
      setPeriodPreset,
      customFrom,
      customTo,
      setCustomFrom,
      setCustomTo,
      calendarMonth,
      setCalendarMonth,
      rangeDates,
      snapshot,
      trends,
      trendDisplayUnit,
      trendDisplayUnitLabel: TREND_DISPLAY_UNIT_LABELS[trendDisplayUnit],
      displayTrendPoints,
      loadingDates,
      loadingSnapshot,
      loadingTrends,
      error,
      isHistoricalView:
        selectedAsOfDate !== null &&
        currentAsOfDate !== null &&
        selectedAsOfDate !== currentAsOfDate,
      emphasizeAsOf,
      emphasizePeriod,
    };
    return result;
  }, [
    portfolioCode,
    availableDates,
    currentAsOfDate,
    selectedAsOfDate,
    setSelectedAsOfDate,
    jumpToLatest,
    periodPreset,
    setPeriodPreset,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    calendarMonth,
    setCalendarMonth,
    rangeDates,
    snapshot,
    trends,
    trendDisplayUnit,
    displayTrendPoints,
    loadingDates,
    loadingSnapshot,
    loadingTrends,
    error,
    emphasizeAsOf,
    emphasizePeriod,
  ]);

  let result = (
    <PortfolioTimeContext.Provider value={value}>
      {children}
    </PortfolioTimeContext.Provider>
  );
  return result;
}

export function usePortfolioTime() {
  let result = useContext(PortfolioTimeContext);
  if (!result) {
    throw new Error("usePortfolioTime must be used within PortfolioTimeProvider");
  }
  return result;
}
