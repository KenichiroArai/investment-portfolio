"use client";

import {
  buildTrendDisplayPoints,
  detectMatchingPreset,
  getCalendarMonthDateRange,
  readTrendBucketPick,
  readTrendDisplayUnit,
  readTrendMinMaxField,
  resolveDateRange,
  resolveDefaultTrendDisplayUnit,
  resolveLatestSnapshotDate,
  resolvePeriodBounds,
  resolvePeriodBoundsForPreset,
  TREND_BUCKET_PICK_LABELS,
  TREND_DISPLAY_UNIT_LABELS,
  TREND_MIN_MAX_FIELD_LABELS,
  type AggregatedTrendPoint,
  type CurrentSnapshotDto,
  type SnapshotDateListDto,
  type SnapshotPeriodPreset,
  type SnapshotTrendsDto,
  type TrendBucketPick,
  type TrendDisplayUnit,
  type TrendMinMaxField,
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
import { shouldShowSnapshotTimeBar } from "@/lib/portfolio-time-bar";

type PortfolioTimeContextValue = {
  portfolioCode: string;
  availableDates: string[];
  currentAsOfDate: string | null;
  selectedAsOfDate: string | null;
  setSelectedAsOfDate: (asOfDate: string) => void;
  jumpToLatest: () => void;
  periodPreset: SnapshotPeriodPreset | null;
  setPeriodPreset: (preset: SnapshotPeriodPreset) => void;
  customFrom: string;
  customTo: string;
  setCustomFrom: (value: string) => void;
  setCustomTo: (value: string) => void;
  calendarMonth: string;
  setCalendarMonth: (value: string) => void;
  rangeDates: string[];
  periodBounds: { from: string; to: string } | null;
  snapshot: CurrentSnapshotDto | null;
  trends: SnapshotTrendsDto | null;
  trendDisplayUnit: TrendDisplayUnit;
  setTrendDisplayUnit: (unit: TrendDisplayUnit) => void;
  trendDisplayUnitLabel: string;
  trendBucketPick: TrendBucketPick;
  setTrendBucketPick: (pick: TrendBucketPick) => void;
  trendBucketPickLabel: string;
  trendMinMaxField: TrendMinMaxField;
  setTrendMinMaxField: (field: TrendMinMaxField) => void;
  trendMinMaxFieldLabel: string;
  displayTrendPoints: AggregatedTrendPoint[];
  baselinePoint: AggregatedTrendPoint | null;
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

function countInclusiveDays(from: string, to: string): number | null {
  let result: number | null = null;
  const fromMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const toMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!fromMatch || !toMatch) {
    return result;
  }
  const fromTime = Date.UTC(
    Number(fromMatch[1]),
    Number(fromMatch[2]) - 1,
    Number(fromMatch[3]),
  );
  const toTime = Date.UTC(
    Number(toMatch[1]),
    Number(toMatch[2]) - 1,
    Number(toMatch[3]),
  );
  if (toTime < fromTime) {
    return result;
  }
  result = Math.round((toTime - fromTime) / 86_400_000) + 1;
  return result;
}

function serializeTrendDisplayUnit(unit: TrendDisplayUnit): string | null {
  let result: string | null = unit === "day" ? null : unit;
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

  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const calendarMonth = searchParams.get("month") ?? "";
  const unitFromUrl = searchParams.get("unit");
  const trendBucketPick = readTrendBucketPick(searchParams.get("pick"));
  const trendMinMaxField = readTrendMinMaxField(searchParams.get("minMaxBy"));

  const periodPreset = useMemo(() => {
    let result: SnapshotPeriodPreset | null = detectMatchingPreset(
      availableDates,
      customFrom || null,
      customTo || null,
    );
    if (result !== null) {
      return result;
    }
    if (!customFrom && !customTo) {
      result = readPeriodPreset(searchParams.get("period"));
      return result;
    }
    return null;
  }, [availableDates, customFrom, customTo, searchParams]);

  const emphasizeAsOf = (() => {
    let result = true;
    const view = searchParams.get("view");
    const panel = searchParams.get("panel");
    const onPortfolioAllocation = pathname.includes(
      `/portfolios/${portfolioCode}/portfolio-allocation`,
    );
    const onAnalysis = pathname.includes(`/portfolios/${portfolioCode}/analysis`);

    if (pathname.includes("/trends")) {
      result = false;
      return result;
    }

    if (onPortfolioAllocation && panel === "trends") {
      result = false;
      return result;
    }

    if (onAnalysis && view === "trends") {
      result = false;
      return result;
    }

    return result;
  })();

  const emphasizePeriod = (() => {
    let result = false;
    const view = searchParams.get("view");
    const panel = searchParams.get("panel");
    const onPortfolioAllocation = pathname.includes(
      `/portfolios/${portfolioCode}/portfolio-allocation`,
    );
    const onAnalysis = pathname.includes(`/portfolios/${portfolioCode}/analysis`);

    if (pathname.includes("/trends") || pathname.includes("/holdings")) {
      result = true;
      return result;
    }

    if (
      pathname.endsWith(`/portfolios/${portfolioCode}/`) ||
      pathname.endsWith(`/portfolios/${portfolioCode}`)
    ) {
      result = true;
      return result;
    }

    if (onPortfolioAllocation && view !== "allocation") {
      result = true;
      return result;
    }

    if (onAnalysis && view === "trends") {
      result = true;
      return result;
    }

    if (onPortfolioAllocation && view === null && panel === null) {
      result = true;
      return result;
    }

    if (onPortfolioAllocation && panel === "holdings") {
      result = true;
    }

    return result;
  })();

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
      const bounds = resolvePeriodBoundsForPreset(preset, availableDates);
      if (!bounds) {
        return result;
      }
      const defaultUnit = resolveDefaultTrendDisplayUnit(preset);
      updateSearchParams({
        from: bounds.from,
        to: bounds.to,
        period: null,
        month: null,
        unit: serializeTrendDisplayUnit(defaultUnit),
      });
      return result;
    },
    [availableDates, updateSearchParams],
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
      const range = getCalendarMonthDateRange(value);
      if (!range) {
        return result;
      }
      const defaultUnit = resolveDefaultTrendDisplayUnit("1m");
      updateSearchParams({
        month: value || null,
        from: range.from,
        to: range.to,
        period: null,
        unit: serializeTrendDisplayUnit(defaultUnit),
      });
      return result;
    },
    [updateSearchParams],
  );

  const setTrendDisplayUnit = useCallback(
    (unit: TrendDisplayUnit) => {
      let result: void = undefined;
      updateSearchParams({
        unit: unit === "day" ? null : unit,
      });
      return result;
    },
    [updateSearchParams],
  );

  const setTrendBucketPick = useCallback(
    (pick: TrendBucketPick) => {
      let result: void = undefined;
      const updates: Record<string, string | null> = {
        pick: pick === "last" ? null : pick,
      };
      if (pick !== "min" && pick !== "max") {
        updates.minMaxBy = null;
      }
      updateSearchParams(updates);
      return result;
    },
    [updateSearchParams],
  );

  const setTrendMinMaxField = useCallback(
    (field: TrendMinMaxField) => {
      let result: void = undefined;
      updateSearchParams({
        minMaxBy: field === "marketValue" ? null : field,
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

      if (!shouldShowSnapshotTimeBar(pathname, portfolioCode)) {
        setAvailableDates([]);
        setCurrentAsOfDate(null);
        setLoadingDates(false);
        return loadResult;
      }

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
  }, [portfolioCode, pathname]);

  useEffect(() => {
    let result: void = undefined;

    if (!shouldShowSnapshotTimeBar(pathname, portfolioCode)) {
      setSelectedAsOfDateState(null);
      return result;
    }

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
  }, [
    availableDates,
    customTo,
    pathname,
    portfolioCode,
    searchParams,
    selectedAsOfDate,
    updateSearchParams,
  ]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadSnapshot() {
      let loadResult: void = undefined;

      if (!shouldShowSnapshotTimeBar(pathname, portfolioCode)) {
        setSnapshot(null);
        setLoadingSnapshot(false);
        return loadResult;
      }

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
  }, [portfolioCode, pathname, selectedAsOfDate, currentAsOfDate]);

  const periodBounds = useMemo(() => {
    let result = resolvePeriodBounds({
      availableDates,
      preset: periodPreset ?? "all",
      customFrom: customFrom || null,
      customTo: customTo || null,
      calendarMonth: calendarMonth || null,
    });
    return result;
  }, [availableDates, periodPreset, customFrom, customTo, calendarMonth]);

  const trendDisplayUnit = useMemo(() => {
    let result: TrendDisplayUnit = "day";
    if (unitFromUrl) {
      result = readTrendDisplayUnit(unitFromUrl);
      return result;
    }
    const rangeDayCount =
      periodBounds !== null
        ? countInclusiveDays(periodBounds.from, periodBounds.to)
        : null;
    result = resolveDefaultTrendDisplayUnit(periodPreset, rangeDayCount);
    return result;
  }, [unitFromUrl, periodBounds, periodPreset]);

  const rangeDates = useMemo(() => {
    let result: string[] = [];
    if (!periodBounds) {
      return result;
    }
    result = resolveDateRange({
      availableDates,
      preset: periodPreset ?? "all",
      customFrom: customFrom || null,
      customTo: customTo || null,
      calendarMonth: calendarMonth || null,
    });
    return result;
  }, [availableDates, periodPreset, customFrom, customTo, calendarMonth, periodBounds]);

  const rangeDatesKey = rangeDates.join(",");
  const availableDatesKey = availableDates.join(",");

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function loadTrends() {
      let loadResult: void = undefined;

      if (!shouldShowSnapshotTimeBar(pathname, portfolioCode)) {
        setTrends(null);
        setLoadingTrends(false);
        return loadResult;
      }

      if (rangeDates.length === 0 || !periodBounds) {
        setTrends(null);
        setLoadingTrends(false);
        return loadResult;
      }

      setLoadingTrends(true);
      const rangeFrom = periodBounds.from;
      const rangeTo = periodBounds.to;
      const priorDates = availableDates.filter((date) => date < rangeFrom);
      const baselineDate = priorDates.at(-1) ?? null;
      const fetchFrom = baselineDate ?? rangeFrom;

      try {
        const response = await fetch(
          getSnapshotTrendsFetchUrl(portfolioCode, fetchFrom, rangeTo),
        );
        if (cancelled) {
          return loadResult;
        }
        if (!response.ok) {
          setTrends(null);
          return loadResult;
        }
        const data = (await response.json()) as SnapshotTrendsDto;
        const filteredPoints = data.points.filter(
          (point) => point.asOfDate >= fetchFrom && point.asOfDate <= rangeTo,
        );
        setTrends({
          portfolioCode: data.portfolioCode,
          from: rangeFrom,
          to: rangeTo,
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
  }, [portfolioCode, pathname, rangeDatesKey, availableDatesKey, periodBounds]);

  const { displayTrendPoints, baselinePoint } = useMemo(() => {
    let result = {
      displayTrendPoints: [] as AggregatedTrendPoint[],
      baselinePoint: null as AggregatedTrendPoint | null,
    };
    if (!trends || trends.points.length === 0) {
      return result;
    }
    const built = buildTrendDisplayPoints(
      trends.points,
      trendDisplayUnit,
      trends.from,
      trends.to,
      {
        pick: trendBucketPick,
        minMaxField: trendMinMaxField,
      },
    );
    result = {
      displayTrendPoints: built.displayPoints,
      baselinePoint: built.baselinePoint,
    };
    return result;
  }, [trends, trendDisplayUnit, trendBucketPick, trendMinMaxField]);

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
      periodBounds,
      snapshot,
      trends,
      trendDisplayUnit,
      setTrendDisplayUnit,
      trendDisplayUnitLabel: TREND_DISPLAY_UNIT_LABELS[trendDisplayUnit],
      trendBucketPick,
      setTrendBucketPick,
      trendBucketPickLabel: TREND_BUCKET_PICK_LABELS[trendBucketPick],
      trendMinMaxField,
      setTrendMinMaxField,
      trendMinMaxFieldLabel: TREND_MIN_MAX_FIELD_LABELS[trendMinMaxField],
      displayTrendPoints,
      baselinePoint,
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
    periodBounds,
    snapshot,
    trends,
    trendDisplayUnit,
    setTrendDisplayUnit,
    trendBucketPick,
    setTrendBucketPick,
    trendMinMaxField,
    setTrendMinMaxField,
    displayTrendPoints,
    baselinePoint,
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
