"use client";

import {
  buildAllocationPeriodChangeRows,
  buildAllocationRatioSeries,
  buildTrendPeriodMetricDeltas,
  findLargestAllocationShareChange,
  formatTrendSparseDataNote,
  type AggregatedTrendPoint,
  type AllocationSeriesInput,
} from "@repo/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { buildAllocationChartSeries } from "@/features/trends/build-allocation-chart-series";
import { TrendMetricTabs } from "@/features/trends/TrendMetricTabs";
import { TrendPeriodSummary } from "@/features/trends/TrendPeriodSummary";
import {
  buildTrendChartBuckets,
  computeTrendChartDeltas,
  computeTrendChartRelativeDeltas,
  mapTrendChartLevelValues,
} from "@/features/trends/trend-chart-buckets";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  formatAsOfDateJa,
  formatMarketValueBaselineSummary,
  formatPercent,
  formatPercentPoint,
  formatPercentRelativeChange,
  formatYen,
} from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

function resolvePeriodEndpoints(
  displayPoints: AggregatedTrendPoint[],
  baselinePoint: AggregatedTrendPoint | null,
): { start: AggregatedTrendPoint; end: AggregatedTrendPoint } | null {
  let result: { start: AggregatedTrendPoint; end: AggregatedTrendPoint } | null = null;

  if (displayPoints.length === 0) {
    return result;
  }

  if (displayPoints.length === 1) {
    if (!baselinePoint) {
      return result;
    }
    result = {
      start: baselinePoint,
      end: displayPoints[0],
    };
    return result;
  }

  result = {
    start: displayPoints[0],
    end: displayPoints[displayPoints.length - 1],
  };
  return result;
}

function resolveAllCompositionKeys(ratioSeries: AllocationSeriesInput[]): string[] {
  let result = ratioSeries.map((item) => item.key);
  return result;
}

function toggleCompositionKey(keys: string[], key: string): string[] {
  let result: string[] = [];

  if (keys.includes(key)) {
    result = keys.filter((item) => item !== key);
    return result;
  }

  result = [...keys, key];
  return result;
}

export function TrendsDetailPanel() {
  const {
    displayTrendPoints,
    baselinePoint,
    trendDisplayUnit,
    trendDisplayUnitLabel,
    loadingTrends,
    snapshot,
    trends,
  } = usePortfolioTime();
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");
  const [selectedCompositionKeys, setSelectedCompositionKeys] = useState<string[]>([]);
  const compositionInitializedRef = useRef(false);
  const activeSchemeCodeRef = useRef("");

  const schemeCodes = snapshot?.analysisSchemes ?? [];
  const activeSchemeCode =
    selectedSchemeCode !== ""
      ? selectedSchemeCode
      : (schemeCodes[0]?.schemeCode ?? "");

  const ratioSeriesForHooks = useMemo(() => {
    let result: AllocationSeriesInput[] = [];

    if (displayTrendPoints.length === 0 || activeSchemeCode === "") {
      return result;
    }

    const chartBuckets = buildTrendChartBuckets({
      displayPoints: displayTrendPoints,
      baselinePoint,
      trendDisplayUnit,
      formatBaselineSummary: () => null,
    });

    result = buildAllocationRatioSeries(chartBuckets.chartPoints, activeSchemeCode);
    return result;
  }, [activeSchemeCode, baselinePoint, displayTrendPoints, trendDisplayUnit]);

  const allCompositionKeys = useMemo(() => {
    let keys = resolveAllCompositionKeys(ratioSeriesForHooks);
    return keys;
  }, [ratioSeriesForHooks]);

  useEffect(() => {
    let result: void = undefined;

    if (allCompositionKeys.length === 0) {
      return result;
    }

    const schemeChanged = activeSchemeCodeRef.current !== activeSchemeCode;
    if (schemeChanged) {
      activeSchemeCodeRef.current = activeSchemeCode;
      compositionInitializedRef.current = true;
      setSelectedCompositionKeys(allCompositionKeys);
      return result;
    }

    if (!compositionInitializedRef.current) {
      compositionInitializedRef.current = true;
      setSelectedCompositionKeys(allCompositionKeys);
    }

    return result;
  }, [activeSchemeCode, allCompositionKeys]);

  const handleCompositionToggle = (key: string): void => {
    setSelectedCompositionKeys((current) => toggleCompositionKey(current, key));
  };

  const handleSelectAllCompositions = (): void => {
    setSelectedCompositionKeys(allCompositionKeys);
  };

  const handleClearCompositionSelection = (): void => {
    setSelectedCompositionKeys([]);
  };

  let result: ReactNode = null;

  if (loadingTrends) {
    result = <p className="trend-chart__loading">推移を読み込み中…</p>;
    return result;
  }

  if (displayTrendPoints.length === 0) {
    result = (
      <p className="trend-chart__empty">
        選択した期間に推移データがありません。期間を広げてください。
      </p>
    );
    return result;
  }

  const chartBuckets = buildTrendChartBuckets({
    displayPoints: displayTrendPoints,
    baselinePoint,
    trendDisplayUnit,
    formatBaselineSummary: (baseline, current) => {
      let summary: string | null = null;
      const delta = current.totalMarketValueMinor - baseline.totalMarketValueMinor;
      if (Number.isFinite(delta)) {
        summary = formatMarketValueBaselineSummary(baseline.sourceAsOfDate, delta);
      }
      return summary;
    },
  });

  const {
    chartPoints,
    labels,
    sourceDates,
    sourceDateLabels,
    singleBucketNote,
    baselineSummary,
  } = chartBuckets;

  const sparseDataNote = (() => {
    let note: string | null = null;
    if (!trends) {
      return note;
    }
    const inRangePoints = trends.points.filter(
      (point) => point.asOfDate >= trends.from && point.asOfDate <= trends.to,
    );
    note = formatTrendSparseDataNote(trends.from, inRangePoints);
    return note;
  })();

  const activeScheme = schemeCodes.find(
    (scheme) => scheme.schemeCode === activeSchemeCode,
  );

  const periodEndpoints = resolvePeriodEndpoints(displayTrendPoints, baselinePoint);

  const allocationSeries =
    activeSchemeCode !== ""
      ? buildAllocationChartSeries(chartPoints, activeSchemeCode)
      : [];

  const ratioSeries =
    activeSchemeCode !== ""
      ? buildAllocationRatioSeries(chartPoints, activeSchemeCode)
      : [];

  const periodChangeRows =
    periodEndpoints && activeSchemeCode !== ""
      ? buildAllocationPeriodChangeRows(
          periodEndpoints.start,
          periodEndpoints.end,
          chartPoints,
          activeSchemeCode,
        )
      : [];

  const largestShareChange = findLargestAllocationShareChange(
    periodChangeRows.map((row) => ({
      key: row.key,
      label: row.label,
      startRatio: row.startRatio,
      endRatio: row.endRatio,
      deltaRatio: row.deltaRatio,
    })),
  );

  const marketValueLevelValues = mapTrendChartLevelValues(
    chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.totalMarketValueMinor,
  );

  const marketValueDeltaValues = computeTrendChartDeltas(
    marketValueLevelValues,
    displayTrendPoints,
    baselinePoint,
    baselinePoint?.totalMarketValueMinor ?? null,
  );

  const marketValueBaselineMinor = baselinePoint?.totalMarketValueMinor ?? null;

  const marketValueDeltaSeries: TrendChartSeries[] = [
    {
      key: "market-value-delta",
      label: "評価額の変化",
      color: "#2563eb",
      values: marketValueDeltaValues,
      levelValues: marketValueLevelValues,
      baselineValue: marketValueBaselineMinor,
      tooltipMode: "trendDelta",
      formatValue: (value) => formatYen(value),
    },
  ];

  const marketValueRelativeRateSeries: TrendChartSeries[] = [
    {
      key: "market-value-relative-rate",
      label: "評価額の変化率",
      color: "#2563eb",
      values: computeTrendChartRelativeDeltas(
        marketValueLevelValues,
        displayTrendPoints,
        baselinePoint,
        marketValueBaselineMinor,
      ),
      levelValues: marketValueLevelValues,
      baselineValue: marketValueBaselineMinor,
      tooltipMode: "relativeRateDelta",
      tooltipUnit: "yen",
      formatValue: (value) => formatPercentRelativeChange(value),
    },
  ];

  const gainLevelValues = mapTrendChartLevelValues(
    chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.unrealizedGainMinor,
  );

  const gainDeltaValues = computeTrendChartDeltas(
    gainLevelValues,
    displayTrendPoints,
    baselinePoint,
    baselinePoint?.unrealizedGainMinor ?? null,
  );

  const gainBaselineMinor = baselinePoint?.unrealizedGainMinor ?? null;

  const gainDeltaSeries: TrendChartSeries[] = [
    {
      key: "gain-delta",
      label: "評価損益の変化",
      color: "#16a34a",
      values: gainDeltaValues,
      levelValues: gainLevelValues,
      baselineValue: gainBaselineMinor,
      tooltipMode: "trendDelta",
      formatValue: (value) => formatYen(value),
    },
  ];

  const gainRelativeRateSeries: TrendChartSeries[] = [
    {
      key: "gain-relative-rate",
      label: "評価損益の変化率",
      color: "#16a34a",
      values: computeTrendChartRelativeDeltas(
        gainLevelValues,
        displayTrendPoints,
        baselinePoint,
        gainBaselineMinor,
      ),
      levelValues: gainLevelValues,
      baselineValue: gainBaselineMinor,
      tooltipMode: "relativeRateDelta",
      tooltipUnit: "yen",
      formatValue: (value) => formatPercentRelativeChange(value),
    },
  ];

  const gainRateBookLevelValues = mapTrendChartLevelValues(
    chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.gainRateOnBook,
  );

  const gainRateContributionsLevelValues = mapTrendChartLevelValues(
    chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.gainRateOnContributions,
  );

  const gainRateBookDeltaValues = computeTrendChartDeltas(
    gainRateBookLevelValues,
    displayTrendPoints,
    baselinePoint,
    baselinePoint?.gainRateOnBook ?? null,
  );

  const gainRateContributionsDeltaValues = computeTrendChartDeltas(
    gainRateContributionsLevelValues,
    displayTrendPoints,
    baselinePoint,
    baselinePoint?.gainRateOnContributions ?? null,
  );

  const gainRateBookBaseline = baselinePoint?.gainRateOnBook ?? null;
  const gainRateContributionsBaseline = baselinePoint?.gainRateOnContributions ?? null;

  const gainRateSeries: TrendChartSeries[] = [
    {
      key: "gain-rate-book",
      label: "簿価ベース利益率",
      color: "#7c3aed",
      values: gainRateBookLevelValues,
      levelValues: gainRateBookLevelValues,
      baselineValue: gainRateBookBaseline,
      tooltipMode: "levelDelta",
      tooltipUnit: "percentPoint",
      formatValue: (value: number) => formatPercent(value),
    },
    {
      key: "gain-rate-contributions",
      label: "拠出金ベース利益率",
      color: "#ea580c",
      values: gainRateContributionsLevelValues,
      levelValues: gainRateContributionsLevelValues,
      baselineValue: gainRateContributionsBaseline,
      tooltipMode: "levelDelta",
      tooltipUnit: "percentPoint",
      formatValue: (value: number) => formatPercent(value),
    },
  ].filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );

  const gainRateDeltaSeries: TrendChartSeries[] = [
    {
      key: "gain-rate-book-delta",
      label: "簿価ベース利益率",
      color: "#7c3aed",
      values: gainRateBookDeltaValues,
      levelValues: gainRateBookLevelValues,
      baselineValue: gainRateBookBaseline,
      tooltipMode: "percentDelta",
      formatValue: (value: number) => formatPercentPoint(value),
    },
    {
      key: "gain-rate-contributions-delta",
      label: "拠出金ベース利益率",
      color: "#ea580c",
      values: gainRateContributionsDeltaValues,
      levelValues: gainRateContributionsLevelValues,
      baselineValue: gainRateContributionsBaseline,
      tooltipMode: "percentDelta",
      formatValue: (value: number) => formatPercentPoint(value),
    },
  ].filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );

  const gainRateRelativeRateSeries: TrendChartSeries[] = [
    {
      key: "gain-rate-book-relative",
      label: "簿価ベース利益率",
      color: "#7c3aed",
      values: computeTrendChartRelativeDeltas(
        gainRateBookLevelValues,
        displayTrendPoints,
        baselinePoint,
        gainRateBookBaseline,
      ),
      levelValues: gainRateBookLevelValues,
      baselineValue: gainRateBookBaseline,
      tooltipMode: "relativeRateDelta",
      tooltipUnit: "percentPoint",
      formatValue: (value: number) => formatPercentRelativeChange(value),
    },
    {
      key: "gain-rate-contributions-relative",
      label: "拠出金ベース利益率",
      color: "#ea580c",
      values: computeTrendChartRelativeDeltas(
        gainRateContributionsLevelValues,
        displayTrendPoints,
        baselinePoint,
        gainRateContributionsBaseline,
      ),
      levelValues: gainRateContributionsLevelValues,
      baselineValue: gainRateContributionsBaseline,
      tooltipMode: "relativeRateDelta",
      tooltipUnit: "percentPoint",
      formatValue: (value: number) => formatPercentRelativeChange(value),
    },
  ].filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );

  const startMarketValue =
    periodEndpoints?.start.totalMarketValueMinor ??
    displayTrendPoints[0].totalMarketValueMinor;
  const endMarketValue =
    periodEndpoints?.end.totalMarketValueMinor ??
    displayTrendPoints[displayTrendPoints.length - 1].totalMarketValueMinor;
  const startDateLabel = formatAsOfDateJa(
    periodEndpoints?.start.sourceAsOfDate ?? displayTrendPoints[0].sourceAsOfDate,
  );
  const endDateLabel = formatAsOfDateJa(
    periodEndpoints?.end.sourceAsOfDate ??
      displayTrendPoints[displayTrendPoints.length - 1].sourceAsOfDate,
  );

  const metricDeltas =
    periodEndpoints !== null
      ? buildTrendPeriodMetricDeltas(periodEndpoints.start, periodEndpoints.end)
      : [];

  result = (
    <div className="trends-detail">
      <TrendPeriodSummary
        startDateLabel={startDateLabel}
        endDateLabel={endDateLabel}
        startMarketValueMinor={startMarketValue}
        endMarketValueMinor={endMarketValue}
        metricDeltas={metricDeltas}
        largestShareChange={largestShareChange}
        sparseDataNote={sparseDataNote}
        singleBucketNote={singleBucketNote}
        baselineSummary={baselineSummary}
      />

      <TrendMetricTabs
        key={snapshot?.asOfDate ?? "pending"}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        trendDisplayUnitLabel={trendDisplayUnitLabel}
        marketValueLevelValues={marketValueLevelValues}
        marketValueBaselineMinor={marketValueBaselineMinor}
        marketValueDeltaSeries={marketValueDeltaSeries}
        marketValueRelativeRateSeries={marketValueRelativeRateSeries}
        gainLevelValues={gainLevelValues}
        gainBaselineMinor={gainBaselineMinor}
        gainDeltaSeries={gainDeltaSeries}
        gainRelativeRateSeries={gainRelativeRateSeries}
        gainRateSeries={gainRateSeries}
        gainRateDeltaSeries={gainRateDeltaSeries}
        gainRateRelativeRateSeries={gainRateRelativeRateSeries}
        allocation={
          schemeCodes.length > 0 && allocationSeries.length > 0
            ? {
                schemeCodes,
                activeSchemeCode,
                onSchemeChange: (schemeCode) => {
                  setSelectedSchemeCode(schemeCode);
                },
                activeSchemeName: activeScheme?.schemeName ?? null,
                allocationSeries,
                ratioSeries,
                periodChangeRows,
                selectedCompositionKeys,
                onCompositionToggle: handleCompositionToggle,
                onSelectAllCompositions: handleSelectAllCompositions,
                onClearCompositionSelection: handleClearCompositionSelection,
                startDateLabel,
                endDateLabel,
              }
            : null
        }
      />
    </div>
  );
  return result;
}
