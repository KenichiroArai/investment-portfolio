"use client";

import {
  computeAllocationShareChanges,
  findLargestAllocationShareChange,
  formatTrendSparseDataNote,
  type AggregatedTrendPoint,
} from "@repo/shared";
import { useState, type ReactNode } from "react";

import { AllocationShareChangeChart } from "@/features/trends/AllocationShareChangeChart";
import { buildAllocationChartSeries } from "@/features/trends/build-allocation-chart-series";
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

function buildSchemeRatios(
  point: AggregatedTrendPoint,
  schemeCode: string,
): Array<{ key: string; label: string; ratio: number | null }> {
  let result: Array<{ key: string; label: string; ratio: number | null }> = [];
  const slices = point.allocationsByScheme[schemeCode] ?? [];
  result = slices.map((slice) => ({
    key: slice.valueCode,
    label: slice.valueName,
    ratio: slice.ratio,
  }));
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
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const schemeCodes = snapshot?.analysisSchemes ?? [];
  const activeSchemeCode =
    selectedSchemeCode !== ""
      ? selectedSchemeCode
      : (schemeCodes[0]?.schemeCode ?? "");
  const activeScheme = schemeCodes.find(
    (scheme) => scheme.schemeCode === activeSchemeCode,
  );

  const periodEndpoints = resolvePeriodEndpoints(displayTrendPoints, baselinePoint);

  const allocationSeries =
    activeSchemeCode !== ""
      ? buildAllocationChartSeries(chartPoints, activeSchemeCode)
      : [];

  const shareChanges =
    periodEndpoints && activeSchemeCode !== ""
      ? computeAllocationShareChanges(
          buildSchemeRatios(periodEndpoints.start, activeSchemeCode),
          buildSchemeRatios(periodEndpoints.end, activeSchemeCode),
        )
      : [];

  const largestShareChange = findLargestAllocationShareChange(shareChanges);

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
          />
        </section>
      ) : null}

      {shareChanges.length > 0 ? (
        <section className="trends-detail__section">
          <AllocationShareChangeChart
            changes={shareChanges}
            caption={`${startDateLabel} → ${endDateLabel}`}
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
