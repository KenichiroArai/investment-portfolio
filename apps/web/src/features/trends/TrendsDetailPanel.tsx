"use client";

import { computeTrendPeriodDeltas } from "@repo/shared";
import { useState, type ReactNode } from "react";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { formatPercent, formatPercentPoint, formatTrendChartMeta, formatYen } from "@/lib/format-yen";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";

function mapSeriesToPercentDeltaSeries(series: TrendChartSeries[]): TrendChartSeries[] {
  let result: TrendChartSeries[] = [];
  result = series.map((item) => ({
    ...item,
    levelValues: item.values,
    values: computeTrendPeriodDeltas(item.values),
    formatValue: (value: number) => formatPercentPoint(value),
    tooltipMode: "percentDelta" as const,
  }));
  return result;
}

export function TrendsDetailPanel() {
  const {
    displayTrendPoints,
    trendDisplayUnitLabel,
    loadingTrends,
    snapshot,
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

  const labels = displayTrendPoints.map((point) => point.bucketLabel);
  const sourceDates = displayTrendPoints.map((point) => point.sourceAsOfDate);
  const schemeCodes = snapshot?.analysisSchemes ?? [];
  const activeSchemeCode =
    selectedSchemeCode !== ""
      ? selectedSchemeCode
      : (schemeCodes[0]?.schemeCode ?? "");
  const activeScheme = schemeCodes.find(
    (scheme) => scheme.schemeCode === activeSchemeCode,
  );

  const hasMultipleBuckets = displayTrendPoints.length >= 2;

  const allocationSeries = (() => {
    let seriesResult: TrendChartSeries[] = [];
    const valueCodes = new Set<string>();
    for (const point of displayTrendPoints) {
      const slices = point.allocationsByScheme[activeSchemeCode] ?? [];
      for (const slice of slices) {
        valueCodes.add(slice.valueCode);
      }
    }
    let colorIndex = 0;
    for (const valueCode of valueCodes) {
      const firstSlice = displayTrendPoints
        .flatMap((point) => point.allocationsByScheme[activeSchemeCode] ?? [])
        .find((slice) => slice.valueCode === valueCode);
      if (!firstSlice) {
        continue;
      }
      seriesResult.push({
        key: valueCode,
        label: firstSlice.valueName,
        color: getAllocationChartColor(colorIndex),
        values: displayTrendPoints.map((point) => {
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

  const allocationDeltaSeries = mapSeriesToPercentDeltaSeries(allocationSeries);

  const gainRateSeries: TrendChartSeries[] = [
    {
      key: "gain-rate-book",
      label: "簿価ベース利益率",
      color: "#7c3aed",
      values: displayTrendPoints.map((point) => point.gainRateOnBook),
      formatValue: (value: number) => formatPercent(value),
    },
    {
      key: "gain-rate-contributions",
      label: "拠出金ベース利益率",
      color: "#ea580c",
      values: displayTrendPoints.map((point) => point.gainRateOnContributions),
      formatValue: (value: number) => formatPercent(value),
    },
  ].filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );

  const gainRateDeltaSeries = mapSeriesToPercentDeltaSeries(gainRateSeries);

  const marketValueDeltaSeries: TrendChartSeries[] = [
    {
      key: "market-value-delta",
      label: "評価額の変化",
      color: "#2563eb",
      values: computeTrendPeriodDeltas(
        displayTrendPoints.map((point) => point.totalMarketValueMinor),
      ),
      formatValue: (value) => formatYen(value),
    },
  ];

  const gainDeltaSeries: TrendChartSeries[] = [
    {
      key: "gain-delta",
      label: "評価損益の変化",
      color: "#16a34a",
      values: computeTrendPeriodDeltas(
        displayTrendPoints.map((point) => point.unrealizedGainMinor),
      ),
      formatValue: (value) => formatYen(value),
    },
  ];

  result = (
    <div className="trends-detail">
      {displayTrendPoints.length === 1 ? (
        <p className="trends-detail__single-bucket-note">
          この期間は1か月分のデータです
        </p>
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
              values: displayTrendPoints.map((point) => point.totalMarketValueMinor),
              formatValue: (value) => formatYen(value),
            },
          ]}
        />
        {hasMultipleBuckets ? (
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
              values: displayTrendPoints.map((point) => point.unrealizedGainMinor),
              formatValue: (value) => formatYen(value),
            },
          ]}
        />
        {hasMultipleBuckets ? (
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
          {hasMultipleBuckets && gainRateDeltaSeries.length > 0 ? (
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
          {hasMultipleBuckets ? (
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
