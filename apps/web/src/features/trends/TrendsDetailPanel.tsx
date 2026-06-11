"use client";

import { useState, type ReactNode } from "react";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import {
  buildTrendChartBuckets,
  computeTrendChartDeltas,
  mapTrendChartLevelValues,
} from "@/features/trends/trend-chart-buckets";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { formatTrendSparseDataNote } from "@repo/shared";
import {
  formatMarketValueBaselineSummary,
  formatPercent,
  formatPercentPoint,
  formatTrendChartMeta,
  formatYen,
} from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

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

  const { chartPoints, labels, sourceDates, hasTrendLines, singleBucketNote, baselineSummary } =
    chartBuckets;

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

  const baselineMarketValue = baselinePoint?.totalMarketValueMinor ?? null;

  const allocationSeries = (() => {
    let seriesResult: TrendChartSeries[] = [];
    const valueCodes = new Set<string>();
    for (const point of chartPoints) {
      const slices = point.allocationsByScheme[activeSchemeCode] ?? [];
      for (const slice of slices) {
        valueCodes.add(slice.valueCode);
      }
    }
    let colorIndex = 0;
    for (const valueCode of valueCodes) {
      const firstSlice = chartPoints
        .flatMap((point) => point.allocationsByScheme[activeSchemeCode] ?? [])
        .find((slice) => slice.valueCode === valueCode);
      if (!firstSlice) {
        continue;
      }
      seriesResult.push({
        key: valueCode,
        label: firstSlice.valueName,
        color: getAllocationChartColor(colorIndex),
        values: chartPoints.map((point) => {
          const slice = (point.allocationsByScheme[activeSchemeCode] ?? []).find(
            (item) => item.valueCode === valueCode,
          );
          return slice ? slice.ratio : null;
        }),
        formatValue: (value) => formatPercent(value),
      });
      colorIndex += 1;
    }
    return seriesResult;
  })();

  const allocationDeltaSeries: TrendChartSeries[] = allocationSeries.map((item) => {
    let baselineRatio: number | null = null;
    if (baselinePoint) {
      const slice = (baselinePoint.allocationsByScheme[activeSchemeCode] ?? []).find(
        (allocation) => allocation.valueCode === item.key,
      );
      baselineRatio = slice ? slice.ratio : null;
    }
    let mapped: TrendChartSeries = {
      ...item,
      levelValues: item.values,
      values: computeTrendChartDeltas(
        item.values,
        displayTrendPoints,
        baselinePoint,
        baselineRatio,
      ),
      formatValue: (value: number) => formatPercentPoint(value),
      tooltipMode: "percentDelta",
    };
    return mapped;
  });

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

  const gainRateDeltaSeries: TrendChartSeries[] = gainRateSeries.map((item) => {
    let baselineValue: number | null = null;
    if (baselinePoint) {
      baselineValue =
        item.key === "gain-rate-book"
          ? baselinePoint.gainRateOnBook
          : baselinePoint.gainRateOnContributions;
    }
    let mapped: TrendChartSeries = {
      ...item,
      levelValues: item.values,
      values: computeTrendChartDeltas(
        item.values,
        displayTrendPoints,
        baselinePoint,
        baselineValue,
      ),
      formatValue: (value: number) => formatPercentPoint(value),
      tooltipMode: "percentDelta",
    };
    return mapped;
  });

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
        baselineMarketValue,
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

  result = (
    <div className="trends-detail">
      {sparseDataNote ? (
        <p className="trends-detail__sparse-data-note">{sparseDataNote}</p>
      ) : null}
      {singleBucketNote ? (
        <p className="trends-detail__single-bucket-note">{singleBucketNote}</p>
      ) : null}
      {baselineSummary ? (
        <p className="trends-detail__baseline-summary">{baselineSummary}</p>
      ) : null}
      <section className="trends-detail__section">
        <TrendBarChart
          title="総資産"
          caption={trendDisplayUnitLabel}
          valueKind="yen"
          labels={labels}
          sourceDates={sourceDates}
          mode="grouped"
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
        {hasTrendLines ? (
          <div className="trends-detail__subsection">
            <TrendLineChart
              title="前回比の変化"
              caption={trendDisplayUnitLabel}
              valueKind="yen"
              labels={labels}
              sourceDates={sourceDates}
              series={marketValueDeltaSeries}
            />
          </div>
        ) : null}
      </section>

      <section className="trends-detail__section">
        <TrendBarChart
          title="損益"
          caption={trendDisplayUnitLabel}
          valueKind="yen"
          labels={labels}
          sourceDates={sourceDates}
          mode="grouped"
          series={[
            {
              key: "gain",
              label: "評価損益",
              color: "#16a34a",
              values: gainLevelValues,
              formatValue: (value) => formatYen(value),
            },
          ]}
        />
        {hasTrendLines ? (
          <div className="trends-detail__subsection">
            <TrendLineChart
              title="前回比の変化"
              caption={trendDisplayUnitLabel}
              valueKind="yen"
              labels={labels}
              sourceDates={sourceDates}
              series={gainDeltaSeries}
            />
          </div>
        ) : null}
      </section>

      {gainRateSeries.length > 0 ? (
        <section className="trends-detail__section">
          <TrendBarChart
            title="利益率"
            caption={trendDisplayUnitLabel}
            valueKind="percent"
            labels={labels}
            sourceDates={sourceDates}
            mode="grouped"
            series={gainRateSeries}
          />
          {hasTrendLines && gainRateDeltaSeries.length > 0 ? (
            <div className="trends-detail__subsection">
              <TrendLineChart
                title="前回比の変化"
                caption={formatTrendChartMeta(trendDisplayUnitLabel, "percentPoint")}
                valueKind="percentPoint"
                labels={labels}
                sourceDates={sourceDates}
                series={gainRateDeltaSeries}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {schemeCodes.length > 0 && allocationSeries.length > 0 ? (
        <section className="trends-detail__section">
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
          <TrendBarChart
            title="分析軸別構成比"
            caption={trendDisplayUnitLabel}
            valueKind="percent"
            labels={labels}
            sourceDates={sourceDates}
            mode="stacked"
            valueDomain={{ min: 0, max: 1 }}
            series={allocationSeries}
            height={240}
          />
          {hasTrendLines ? (
            <>
              <div className="trends-detail__subsection">
                <TrendLineChart
                  title="構成比の推移"
                  caption={trendDisplayUnitLabel}
                  valueKind="percent"
                  labels={labels}
                  sourceDates={sourceDates}
                  domainMode="fitData"
                  series={allocationSeries}
                  height={240}
                />
              </div>
              <div className="trends-detail__subsection">
                <TrendLineChart
                  title="前回比の変化"
                  caption={formatTrendChartMeta(trendDisplayUnitLabel, "percentPoint")}
                  valueKind="percentPoint"
                  labels={labels}
                  sourceDates={sourceDates}
                  series={allocationDeltaSeries}
                  height={240}
                />
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
  return result;
}
