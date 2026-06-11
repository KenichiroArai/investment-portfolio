"use client";

import {
  buildAllocationPeriodChangeRows,
  buildAllocationRatioSeries,
  findLargestAllocationShareChange,
  formatTrendSparseDataNote,
  sortAllocationPeriodChangeRows,
  type AggregatedTrendPoint,
} from "@repo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { AllocationPeriodChangeTable } from "@/features/trends/AllocationPeriodChangeTable";
import { buildAllocationChartSeries } from "@/features/trends/build-allocation-chart-series";
import { CompositionRatioLineChart } from "@/features/trends/CompositionRatioLineChart";
import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import { TrendPeriodSummary } from "@/features/trends/TrendPeriodSummary";
import { TrendStackedAreaChart } from "@/features/trends/TrendStackedAreaChart";
import {
  buildTrendChartBuckets,
  computeTrendChartDeltas,
  mapTrendChartLevelValues,
} from "@/features/trends/trend-chart-buckets";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  formatAsOfDateJa,
  formatMarketValueBaselineSummary,
  formatPercent,
  formatTrendChartMeta,
  formatYen,
} from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

const MAX_SELECTED_COMPOSITIONS = 5;
const AUTO_SELECT_COMPOSITION_COUNT = 3;

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

function resolveAutoSelectedCompositionKeys(
  periodChangeRows: ReturnType<typeof buildAllocationPeriodChangeRows>,
): string[] {
  let result = sortAllocationPeriodChangeRows(periodChangeRows, "deltaRatio", "desc", true)
    .slice(0, AUTO_SELECT_COMPOSITION_COUNT)
    .map((row) => row.key);
  return result;
}

function toggleCompositionKey(
  explicitKeys: string[],
  key: string,
  autoKeys: string[],
): string[] {
  let effectiveKeys = explicitKeys.length > 0 ? explicitKeys : autoKeys;
  let result: string[] = [];

  if (effectiveKeys.includes(key)) {
    result = effectiveKeys.filter((item) => item !== key);
    return result;
  }

  result = [...effectiveKeys, key];
  if (result.length > MAX_SELECTED_COMPOSITIONS) {
    result = result.slice(result.length - MAX_SELECTED_COMPOSITIONS);
  }
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const schemeCodes = snapshot?.analysisSchemes ?? [];
  const activeSchemeCode =
    selectedSchemeCode !== ""
      ? selectedSchemeCode
      : (schemeCodes[0]?.schemeCode ?? "");

  const periodChangeRowsForHooks = useMemo(() => {
    let result: ReturnType<typeof buildAllocationPeriodChangeRows> = [];

    if (displayTrendPoints.length === 0 || activeSchemeCode === "") {
      return result;
    }

    const chartBuckets = buildTrendChartBuckets({
      displayPoints: displayTrendPoints,
      baselinePoint,
      trendDisplayUnit,
      formatBaselineSummary: () => null,
    });
    const periodEndpoints = resolvePeriodEndpoints(displayTrendPoints, baselinePoint);

    if (!periodEndpoints) {
      return result;
    }

    result = buildAllocationPeriodChangeRows(
      periodEndpoints.start,
      periodEndpoints.end,
      chartBuckets.chartPoints,
      activeSchemeCode,
    );
    return result;
  }, [
    activeSchemeCode,
    baselinePoint,
    displayTrendPoints,
    trendDisplayUnit,
  ]);

  const autoSelectedCompositionKeys = useMemo(() => {
    let keys = resolveAutoSelectedCompositionKeys(periodChangeRowsForHooks);
    return keys;
  }, [periodChangeRowsForHooks]);

  const effectiveSelectedCompositionKeys = useMemo(() => {
    let keys: string[] = [];
    if (selectedCompositionKeys.length > 0) {
      keys = selectedCompositionKeys;
      return keys;
    }
    keys = autoSelectedCompositionKeys;
    return keys;
  }, [selectedCompositionKeys, autoSelectedCompositionKeys]);

  const handleCompositionToggle = (key: string): void => {
    setSelectedCompositionKeys((current) =>
      toggleCompositionKey(current, key, autoSelectedCompositionKeys),
    );
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

  const marketValueDeltaSeries: TrendChartSeries[] = [
    {
      key: "market-value-delta",
      label: "評価額の変化",
      color: "#2563eb",
      values: computeTrendChartDeltas(
        marketValueLevelValues,
        displayTrendPoints,
        baselinePoint,
        baselinePoint?.totalMarketValueMinor ?? null,
      ),
      formatValue: (value) => formatYen(value),
    },
  ];

  const gainLevelValues = mapTrendChartLevelValues(
    chartPoints,
    displayTrendPoints,
    baselinePoint,
    (point) => point.unrealizedGainMinor,
  );

  const gainDeltaSeries: TrendChartSeries[] = [
    {
      key: "gain-delta",
      label: "評価損益の変化",
      color: "#16a34a",
      values: computeTrendChartDeltas(
        gainLevelValues,
        displayTrendPoints,
        baselinePoint,
        baselinePoint?.unrealizedGainMinor ?? null,
      ),
      formatValue: (value) => formatYen(value),
    },
  ];

  const gainRateSeries: TrendChartSeries[] = [
    {
      key: "gain-rate-book",
      label: "簿価ベース利益率",
      color: "#7c3aed",
      values: mapTrendChartLevelValues(
        chartPoints,
        displayTrendPoints,
        baselinePoint,
        (point) => point.gainRateOnBook,
      ),
      formatValue: (value: number) => formatPercent(value),
    },
    {
      key: "gain-rate-contributions",
      label: "拠出金ベース利益率",
      color: "#ea580c",
      values: mapTrendChartLevelValues(
        chartPoints,
        displayTrendPoints,
        baselinePoint,
        (point) => point.gainRateOnContributions,
      ),
      formatValue: (value: number) => formatPercent(value),
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

  result = (
    <div className="trends-detail">
      <TrendPeriodSummary
        startDateLabel={startDateLabel}
        endDateLabel={endDateLabel}
        startMarketValueMinor={startMarketValue}
        endMarketValueMinor={endMarketValue}
        largestShareChange={largestShareChange}
        sparseDataNote={sparseDataNote}
        singleBucketNote={singleBucketNote}
        baselineSummary={baselineSummary}
      />

      {schemeCodes.length > 0 && allocationSeries.length > 0 ? (
        <section className="trends-detail__section trends-detail__section--hero">
          <div className="analysis-axis-tabs" role="tablist" aria-label="分析軸">
            {schemeCodes.map((scheme) => {
              let tab = (
                <button
                  key={scheme.schemeCode}
                  type="button"
                  role="tab"
                  aria-selected={scheme.schemeCode === activeSchemeCode}
                  className={
                    scheme.schemeCode === activeSchemeCode ? "is-active" : undefined
                  }
                  onClick={() => {
                    setSelectedSchemeCode(scheme.schemeCode);
                    setSelectedCompositionKeys([]);
                  }}
                >
                  {scheme.schemeName}
                </button>
              );
              return tab;
            })}
          </div>
          {activeScheme ? (
            <p className="trends-detail__scheme-label">{activeScheme.schemeName}</p>
          ) : null}
          <TrendStackedAreaChart
            title="構成比の推移"
            caption={trendDisplayUnitLabel}
            labels={labels}
            sourceDates={sourceDates}
            sourceDateLabels={sourceDateLabels}
            series={allocationSeries.map((item) => ({
              ...item,
              formatValue: (value) => formatPercent(value),
            }))}
            height={300}
            selectedSeriesKeys={effectiveSelectedCompositionKeys}
            onSeriesToggle={handleCompositionToggle}
          />
        </section>
      ) : null}

      {ratioSeries.length > 0 ? (
        <section className="trends-detail__section">
          <CompositionRatioLineChart
            labels={labels}
            sourceDates={sourceDates}
            sourceDateLabels={sourceDateLabels}
            ratioSeries={ratioSeries}
            selectedKeys={effectiveSelectedCompositionKeys}
            caption={trendDisplayUnitLabel}
          />
        </section>
      ) : null}

      {periodChangeRows.length > 0 ? (
        <section className="trends-detail__section">
          <AllocationPeriodChangeTable
            rows={periodChangeRows}
            selectedKeys={effectiveSelectedCompositionKeys}
            startDateLabel={startDateLabel}
            endDateLabel={endDateLabel}
            onToggleRow={handleCompositionToggle}
          />
        </section>
      ) : null}

      <section className="trends-detail__section">
        <TrendLineChart
          title="総資産の推移"
          caption={trendDisplayUnitLabel}
          valueKind="yen"
          height={180}
          labels={labels}
          sourceDates={sourceDates}
          sourceDateLabels={sourceDateLabels}
          series={[
            {
              key: "market-value",
              label: "評価額",
              color: "#2563eb",
              values: marketValueLevelValues,
              formatValue: (value) => formatYen(value),
            },
          ]}
        />
      </section>

      <section className="trends-detail__section trends-detail__details">
        <button
          type="button"
          className="trends-detail__details-toggle"
          aria-expanded={detailsOpen}
          onClick={() => {
            setDetailsOpen((open) => !open);
          }}
        >
          詳細指標を{detailsOpen ? "閉じる" : "表示"}
        </button>
        {detailsOpen ? (
          <div className="trends-detail__details-panel">
            <TrendBarChart
              title="評価額の増減"
              caption={trendDisplayUnitLabel}
              valueKind="yen"
              height={180}
              labels={labels}
              sourceDates={sourceDates}
              sourceDateLabels={sourceDateLabels}
              mode="grouped"
              series={marketValueDeltaSeries}
            />
            <div className="trends-detail__subsection">
              <TrendBarChart
                title="評価損益の増減"
                caption={trendDisplayUnitLabel}
                valueKind="yen"
                height={180}
                labels={labels}
                sourceDates={sourceDates}
                sourceDateLabels={sourceDateLabels}
                mode="grouped"
                series={gainDeltaSeries}
              />
            </div>
            {gainRateSeries.length > 0 ? (
              <div className="trends-detail__subsection">
                <TrendLineChart
                  title="利益率の推移"
                  caption={formatTrendChartMeta(trendDisplayUnitLabel, "percent")}
                  valueKind="percent"
                  height={180}
                  labels={labels}
                  sourceDates={sourceDates}
                  sourceDateLabels={sourceDateLabels}
                  domainMode="fitData"
                  series={gainRateSeries}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
  return result;
}
