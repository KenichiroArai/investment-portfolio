"use client";

import type {
  AllocationPeriodChangeRow,
  AllocationSeriesInput,
} from "@repo/shared";
import { useState, type ReactNode } from "react";

import { AllocationPeriodChangeTable } from "@/features/trends/AllocationPeriodChangeTable";
import { CompositionRatioLineChart } from "@/features/trends/CompositionRatioLineChart";
import { CompositionSelectionToolbar } from "@/features/trends/CompositionSelectionToolbar";
import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { TrendLineChart } from "@/features/trends/TrendLineChart";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  TrendStackedAreaChart,
  type TrendStackedAreaSeries,
} from "@/features/trends/TrendStackedAreaChart";
import { formatPercent, formatTrendChartMeta, formatYen } from "@/lib/format-yen";

type TrendMetricTab = "allocation" | "market-value" | "gain" | "gain-rate";
type MarketValueView = "level" | "delta";

type AnalysisScheme = {
  schemeCode: string;
  schemeName: string;
};

const GAIN_RATE_SUB_TAB_LABELS: Record<string, string> = {
  "gain-rate-book": "簿価ベース",
  "gain-rate-contributions": "拠出金ベース",
};

type TrendMetricTabsAllocation = {
  schemeCodes: AnalysisScheme[];
  activeSchemeCode: string;
  onSchemeChange: (schemeCode: string) => void;
  activeSchemeName: string | null;
  allocationSeries: TrendStackedAreaSeries[];
  ratioSeries: AllocationSeriesInput[];
  periodChangeRows: AllocationPeriodChangeRow[];
  selectedCompositionKeys: string[];
  onCompositionToggle: (key: string) => void;
  onSelectAllCompositions: () => void;
  onClearCompositionSelection: () => void;
  startDateLabel: string;
  endDateLabel: string;
};

type TrendMetricTabsProps = {
  labels: string[];
  sourceDates: string[];
  sourceDateLabels: string[];
  trendDisplayUnitLabel: string;
  marketValueLevelValues: Array<number | null>;
  marketValueDeltaSeries: TrendChartSeries[];
  gainDeltaSeries: TrendChartSeries[];
  gainRateSeries: TrendChartSeries[];
  allocation?: TrendMetricTabsAllocation | null;
};

function resolveInitialMetric(hasAllocation: boolean): TrendMetricTab {
  let result: TrendMetricTab = "market-value";
  if (hasAllocation) {
    result = "allocation";
  }
  return result;
}

export function TrendMetricTabs({
  labels,
  sourceDates,
  sourceDateLabels,
  trendDisplayUnitLabel,
  marketValueLevelValues,
  marketValueDeltaSeries,
  gainDeltaSeries,
  gainRateSeries,
  allocation = null,
}: TrendMetricTabsProps) {
  const hasAllocation =
    allocation !== null &&
    allocation.schemeCodes.length > 0 &&
    allocation.allocationSeries.length > 0;

  const [activeMetric, setActiveMetric] = useState<TrendMetricTab>(() =>
    resolveInitialMetric(hasAllocation),
  );
  const [activeMarketValueView, setActiveMarketValueView] =
    useState<MarketValueView>("level");
  const [activeGainRateKey, setActiveGainRateKey] = useState(
    gainRateSeries[0]?.key ?? "gain-rate-book",
  );

  const mainTabs: Array<{ key: TrendMetricTab; label: string }> = [];
  if (hasAllocation) {
    mainTabs.push({ key: "allocation", label: "構成比" });
  }
  mainTabs.push(
    { key: "market-value", label: "評価額" },
    { key: "gain", label: "損益" },
  );
  if (gainRateSeries.length > 0) {
    mainTabs.push({ key: "gain-rate", label: "利益率" });
  }

  const resolvedGainRateKey = gainRateSeries.some(
    (series) => series.key === activeGainRateKey,
  )
    ? activeGainRateKey
    : (gainRateSeries[0]?.key ?? activeGainRateKey);

  const activeGainRateSeries = gainRateSeries.filter(
    (series) => series.key === resolvedGainRateKey,
  );

  let chartPanel: ReactNode = null;

  if (activeMetric === "allocation" && allocation && hasAllocation) {
    chartPanel = (
      <div className="trend-metric-tabs__allocation-panel">
        <div
          className="analysis-axis-tabs trend-metric-tabs__subtabs"
          role="tablist"
          aria-label="構成比の分析軸"
        >
          {allocation.schemeCodes.map((scheme) => {
            let schemeTab = (
              <button
                key={scheme.schemeCode}
                type="button"
                role="tab"
                aria-selected={scheme.schemeCode === allocation.activeSchemeCode}
                className={
                  scheme.schemeCode === allocation.activeSchemeCode ? "is-active" : undefined
                }
                onClick={() => {
                  allocation.onSchemeChange(scheme.schemeCode);
                }}
              >
                {scheme.schemeName}
              </button>
            );
            return schemeTab;
          })}
        </div>
        {allocation.activeSchemeName ? (
          <p className="trends-detail__scheme-label">{allocation.activeSchemeName}</p>
        ) : null}
        <CompositionSelectionToolbar
          selectedCount={allocation.selectedCompositionKeys.length}
          totalCount={allocation.ratioSeries.length}
          onSelectAll={allocation.onSelectAllCompositions}
          onClearSelection={allocation.onClearCompositionSelection}
        />
        <TrendStackedAreaChart
          title="構成比の推移"
          caption={trendDisplayUnitLabel}
          labels={labels}
          sourceDates={sourceDates}
          sourceDateLabels={sourceDateLabels}
          series={allocation.allocationSeries.map((item) => ({
            ...item,
            formatValue: (value) => formatPercent(value),
          }))}
          height={300}
          selectedSeriesKeys={allocation.selectedCompositionKeys}
          onSeriesToggle={allocation.onCompositionToggle}
        />
        {allocation.periodChangeRows.length > 0 ? (
          <AllocationPeriodChangeTable
            rows={allocation.periodChangeRows}
            selectedKeys={allocation.selectedCompositionKeys}
            startDateLabel={allocation.startDateLabel}
            endDateLabel={allocation.endDateLabel}
            onToggleRow={allocation.onCompositionToggle}
          />
        ) : null}
        {allocation.ratioSeries.length > 0 ? (
          <CompositionRatioLineChart
            labels={labels}
            sourceDates={sourceDates}
            sourceDateLabels={sourceDateLabels}
            ratioSeries={allocation.ratioSeries}
            selectedKeys={allocation.selectedCompositionKeys}
            caption={trendDisplayUnitLabel}
          />
        ) : null}
      </div>
    );
  }

  if (activeMetric === "market-value" && activeMarketValueView === "level") {
    chartPanel = (
      <TrendLineChart
        title="評価額"
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
    );
  }

  if (activeMetric === "market-value" && activeMarketValueView === "delta") {
    chartPanel = (
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
    );
  }

  if (activeMetric === "gain") {
    chartPanel = (
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
    );
  }

  if (activeMetric === "gain-rate" && activeGainRateSeries.length > 0) {
    chartPanel = (
      <TrendLineChart
        title="利益率の推移"
        caption={formatTrendChartMeta(trendDisplayUnitLabel, "percent")}
        valueKind="percent"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        domainMode="fitData"
        series={activeGainRateSeries}
      />
    );
  }

  let result: ReactNode = (
    <section className="trends-detail__section trend-metric-tabs">
      <div className="analysis-axis-tabs" role="tablist" aria-label="指標">
        {mainTabs.map((tab) => {
          let tabButton = (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeMetric === tab.key}
              className={activeMetric === tab.key ? "is-active" : undefined}
              onClick={() => {
                setActiveMetric(tab.key);
              }}
            >
              {tab.label}
            </button>
          );
          return tabButton;
        })}
      </div>

      {activeMetric === "market-value" ? (
        <div
          className="analysis-axis-tabs trend-metric-tabs__subtabs"
          role="tablist"
          aria-label="評価額の表示"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMarketValueView === "level"}
            className={activeMarketValueView === "level" ? "is-active" : undefined}
            onClick={() => {
              setActiveMarketValueView("level");
            }}
          >
            推移
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMarketValueView === "delta"}
            className={activeMarketValueView === "delta" ? "is-active" : undefined}
            onClick={() => {
              setActiveMarketValueView("delta");
            }}
          >
            増減
          </button>
        </div>
      ) : null}

      {activeMetric === "gain-rate" && gainRateSeries.length > 1 ? (
        <div
          className="analysis-axis-tabs trend-metric-tabs__subtabs"
          role="tablist"
          aria-label="利益率の表示"
        >
          {gainRateSeries.map((series) => {
            const subTabLabel = GAIN_RATE_SUB_TAB_LABELS[series.key] ?? series.label;
            let subTabButton = (
              <button
                key={series.key}
                type="button"
                role="tab"
                aria-selected={resolvedGainRateKey === series.key}
                className={resolvedGainRateKey === series.key ? "is-active" : undefined}
                onClick={() => {
                  setActiveGainRateKey(series.key);
                }}
              >
                {subTabLabel}
              </button>
            );
            return subTabButton;
          })}
        </div>
      ) : null}

      <div role="tabpanel">{chartPanel}</div>
    </section>
  );
  return result;
}
