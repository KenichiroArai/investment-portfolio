"use client";

import type {
  AllocationPeriodChangeRow,
  AllocationSeriesInput,
  AllocationSlice,
} from "@repo/shared";
import { useState, type ReactNode } from "react";

import { AllocationCrossLink } from "@/features/allocation/AllocationCrossLink";
import { AllocationSchemeTabs } from "@/features/allocation/AllocationSchemeTabs";
import { AllocationSnapshotCompact } from "@/features/allocation/AllocationSnapshotCompact";
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
import {
  formatPercent,
  formatPercentRelativeChange,
  formatTrendChartMeta,
  formatYen,
} from "@/lib/format-yen";
import { CHART_POSITIVE_COLOR } from "@/lib/chart-theme";

type TrendMetricTab = "allocation" | "market-value" | "gain" | "gain-rate";
type MetricView = "level" | "delta" | "relative-rate";

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
  endSnapshotSlices: AllocationSlice[];
  endAsOfDate: string | null;
  uncoveredMinor: number | null;
  portfolioCode: string;
  isPortfolioInstrumentMode?: boolean;
};

type TrendMetricTabsProps = {
  labels: string[];
  sourceDates: string[];
  sourceDateLabels: string[];
  trendDisplayUnitLabel: string;
  marketValueLevelValues: Array<number | null>;
  marketValueBaselineMinor?: number | null;
  marketValueDeltaSeries: TrendChartSeries[];
  marketValueRelativeRateSeries: TrendChartSeries[];
  gainLevelValues: Array<number | null>;
  gainBaselineMinor?: number | null;
  gainDeltaSeries: TrendChartSeries[];
  gainRelativeRateSeries: TrendChartSeries[];
  gainRateSeries: TrendChartSeries[];
  gainRateDeltaSeries: TrendChartSeries[];
  gainRateRelativeRateSeries: TrendChartSeries[];
  allocation?: TrendMetricTabsAllocation | null;
  initialMetric?: TrendMetricTab;
  onMetricChange?: (metric: TrendMetricTab) => void;
  metricMode?: "portfolio" | "allocation" | "all";
  hideSchemeTabs?: boolean;
};

function resolveInitialMetric(
  hasAllocation: boolean,
  metricMode: "portfolio" | "allocation" | "all",
): TrendMetricTab {
  let result: TrendMetricTab = "market-value";

  if (metricMode === "allocation" || metricMode === "portfolio") {
    result = "allocation";
    return result;
  }

  if (hasAllocation && metricMode === "all") {
    result = "allocation";
  }

  return result;
}

const GAIN_RATE_DELTA_KEYS: Record<string, string> = {
  "gain-rate-book": "gain-rate-book-delta",
  "gain-rate-contributions": "gain-rate-contributions-delta",
};

const GAIN_RATE_RELATIVE_KEYS: Record<string, string> = {
  "gain-rate-book": "gain-rate-book-relative",
  "gain-rate-contributions": "gain-rate-contributions-relative",
};

function filterGainRateSeries(
  series: TrendChartSeries[],
  mappedKey: string,
): TrendChartSeries[] {
  let result = series.filter((item) => item.key === mappedKey);
  return result;
}

export function TrendMetricTabs({
  labels,
  sourceDates,
  sourceDateLabels,
  trendDisplayUnitLabel,
  marketValueLevelValues,
  marketValueBaselineMinor = null,
  marketValueDeltaSeries,
  marketValueRelativeRateSeries,
  gainLevelValues,
  gainBaselineMinor = null,
  gainDeltaSeries,
  gainRelativeRateSeries,
  gainRateSeries,
  gainRateDeltaSeries,
  gainRateRelativeRateSeries,
  allocation = null,
  initialMetric,
  onMetricChange,
  metricMode = "all",
  hideSchemeTabs = false,
}: TrendMetricTabsProps) {
  const hasAllocation =
    allocation !== null && allocation.allocationSeries.length > 0;

  const defaultMetric = resolveInitialMetric(hasAllocation, metricMode);
  const [activeMetric, setActiveMetricState] = useState<TrendMetricTab>(
    initialMetric ?? defaultMetric,
  );
  const activeMetricResolved = initialMetric ?? activeMetric;

  const setActiveMetric = (metric: TrendMetricTab): void => {
    let result: void = undefined;
    setActiveMetricState(metric);
    if (onMetricChange) {
      onMetricChange(metric);
    }
    return result;
  };
  const [activeMarketValueView, setActiveMarketValueView] =
    useState<MetricView>("level");
  const [activeGainView, setActiveGainView] = useState<MetricView>("level");
  const [activeGainRateView, setActiveGainRateView] = useState<MetricView>("level");
  const [activeAllocationView, setActiveAllocationView] =
    useState<MetricView>("delta");
  const [activeGainRateKey, setActiveGainRateKey] = useState(
    gainRateSeries[0]?.key ?? "gain-rate-book",
  );

  const mainTabs: Array<{ key: TrendMetricTab; label: string }> = [];
  if (hasAllocation) {
    mainTabs.push({ key: "allocation", label: "構成比" });
  }
  if (metricMode !== "allocation") {
    mainTabs.push(
      { key: "market-value", label: "評価額" },
      { key: "gain", label: "損益" },
    );
    if (gainRateSeries.length > 0) {
      mainTabs.push({ key: "gain-rate", label: "利益率" });
    }
  }

  const resolvedGainRateKey = gainRateSeries.some(
    (series) => series.key === activeGainRateKey,
  )
    ? activeGainRateKey
    : (gainRateSeries[0]?.key ?? activeGainRateKey);

  const activeGainRateLevelSeries = gainRateSeries.filter(
    (series) => series.key === resolvedGainRateKey,
  );

  const activeGainRateDeltaSeries = filterGainRateSeries(
    gainRateDeltaSeries,
    GAIN_RATE_DELTA_KEYS[resolvedGainRateKey] ?? "",
  );

  const activeGainRateRelativeSeries = filterGainRateSeries(
    gainRateRelativeRateSeries,
    GAIN_RATE_RELATIVE_KEYS[resolvedGainRateKey] ?? "",
  );

  let chartPanel: ReactNode = null;

  if (activeMetricResolved === "allocation" && allocation && hasAllocation) {
    const allocationPanelContent = (
      <>
        {allocation.periodChangeRows.length > 0 ? (
          <AllocationPeriodChangeTable
            rows={allocation.periodChangeRows}
            selectedKeys={allocation.selectedCompositionKeys}
            startDateLabel={allocation.startDateLabel}
            endDateLabel={allocation.endDateLabel}
            onToggleRow={allocation.onCompositionToggle}
            title={
              allocation.isPortfolioInstrumentMode
                ? "銘柄全体の変化"
                : "期間内の構成変化"
            }
            entityColumnLabel={
              allocation.isPortfolioInstrumentMode ? "銘柄" : "分類"
            }
            defaultSortColumn={
              allocation.isPortfolioInstrumentMode ? "sortOrder" : "deltaRatio"
            }
            defaultSortDirection={
              allocation.isPortfolioInstrumentMode ? "asc" : "desc"
            }
          />
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr] lg:items-start">
          <AllocationSnapshotCompact
            slices={allocation.endSnapshotSlices}
            asOfDateLabel={allocation.endDateLabel}
            uncoveredMinor={allocation.uncoveredMinor}
          />
          {allocation.isPortfolioInstrumentMode ? (
            <AllocationCrossLink
              portfolioCode={allocation.portfolioCode}
              target="portfolio-composition"
              schemeCode=""
              asOfDate={allocation.endAsOfDate}
              label="期末断面の詳細は構成比タブで見る"
            />
          ) : (
            <AllocationCrossLink
              portfolioCode={allocation.portfolioCode}
              target="analysis"
              schemeCode={allocation.activeSchemeCode}
              asOfDate={allocation.endAsOfDate}
              label="断面の詳細・銘柄内訳は資産配分で見る"
            />
          )}
        </div>
        <CompositionSelectionToolbar
          selectedCount={allocation.selectedCompositionKeys.length}
          totalCount={allocation.ratioSeries.length}
          onSelectAll={allocation.onSelectAllCompositions}
          onClearSelection={allocation.onClearCompositionSelection}
        />
        <div
          className="analysis-axis-tabs trend-metric-tabs__subtabs"
          role="tablist"
          aria-label="構成比グラフの表示"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeAllocationView === "level"}
            className={activeAllocationView === "level" ? "is-active" : undefined}
            onClick={() => {
              setActiveAllocationView("level");
            }}
          >
            推移
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeAllocationView === "delta"}
            className={activeAllocationView === "delta" ? "is-active" : undefined}
            onClick={() => {
              setActiveAllocationView("delta");
            }}
          >
            増減
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeAllocationView === "relative-rate"}
            className={activeAllocationView === "relative-rate" ? "is-active" : undefined}
            onClick={() => {
              setActiveAllocationView("relative-rate");
            }}
          >
            変化率
          </button>
        </div>
        {activeAllocationView === "level" ? (
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
        ) : null}
        {allocation.ratioSeries.length > 0 ? (
          <CompositionRatioLineChart
            labels={labels}
            sourceDates={sourceDates}
            sourceDateLabels={sourceDateLabels}
            ratioSeries={allocation.ratioSeries}
            selectedKeys={allocation.selectedCompositionKeys}
            view={activeAllocationView}
            caption={trendDisplayUnitLabel}
          />
        ) : null}
      </>
    );

    chartPanel = (
      <div className="trend-metric-tabs__allocation-panel space-y-4">
        {hideSchemeTabs ? (
          allocationPanelContent
        ) : (
          <AllocationSchemeTabs
            variant="buttons"
            schemes={allocation.schemeCodes}
            activeSchemeCode={allocation.activeSchemeCode}
            onSchemeChange={allocation.onSchemeChange}
            renderPanel={() => allocationPanelContent}
          />
        )}
      </div>
    );
  }

  if (activeMetricResolved === "market-value" && activeMarketValueView === "level") {
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
            levelValues: marketValueLevelValues,
            baselineValue: marketValueBaselineMinor,
            tooltipMode: "levelDelta",
            tooltipUnit: "yen",
            formatValue: (value) => formatYen(value),
          },
        ]}
      />
    );
  }

  if (activeMetricResolved === "market-value" && activeMarketValueView === "delta") {
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

  if (activeMetricResolved === "market-value" && activeMarketValueView === "relative-rate") {
    chartPanel = (
      <TrendBarChart
        title="評価額の変化率"
        caption={formatTrendChartMeta(trendDisplayUnitLabel, "percent")}
        valueKind="percent"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        mode="grouped"
        series={marketValueRelativeRateSeries}
      />
    );
  }

  if (activeMetricResolved === "gain" && activeGainView === "level") {
    chartPanel = (
      <TrendLineChart
        title="評価損益"
        caption={trendDisplayUnitLabel}
        valueKind="yen"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        series={[
          {
            key: "gain",
            label: "評価損益",
            color: CHART_POSITIVE_COLOR,
            values: gainLevelValues,
            levelValues: gainLevelValues,
            baselineValue: gainBaselineMinor,
            tooltipMode: "levelDelta",
            tooltipUnit: "yen",
            formatValue: (value) => formatYen(value),
          },
        ]}
      />
    );
  }

  if (activeMetricResolved === "gain" && activeGainView === "delta") {
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

  if (activeMetricResolved === "gain" && activeGainView === "relative-rate") {
    chartPanel = (
      <TrendBarChart
        title="評価損益の変化率"
        caption={formatTrendChartMeta(trendDisplayUnitLabel, "percent")}
        valueKind="percent"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        mode="grouped"
        series={gainRelativeRateSeries}
      />
    );
  }

  if (activeMetricResolved === "gain-rate" && activeGainRateView === "level" && activeGainRateLevelSeries.length > 0) {
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
        series={activeGainRateLevelSeries}
      />
    );
  }

  if (activeMetricResolved === "gain-rate" && activeGainRateView === "delta" && activeGainRateDeltaSeries.length > 0) {
    chartPanel = (
      <TrendBarChart
        title="利益率の増減"
        caption={formatTrendChartMeta(trendDisplayUnitLabel, "percentPoint")}
        valueKind="percentPoint"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        mode="grouped"
        series={activeGainRateDeltaSeries}
      />
    );
  }

  if (
    activeMetricResolved === "gain-rate" &&
    activeGainRateView === "relative-rate" &&
    activeGainRateRelativeSeries.length > 0
  ) {
    chartPanel = (
      <TrendBarChart
        title="利益率の変化率"
        caption={formatTrendChartMeta(trendDisplayUnitLabel, "percent")}
        valueKind="percent"
        height={180}
        labels={labels}
        sourceDates={sourceDates}
        sourceDateLabels={sourceDateLabels}
        mode="grouped"
        series={activeGainRateRelativeSeries.map((item) => ({
          ...item,
          formatValue: (value) => formatPercentRelativeChange(value),
        }))}
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
              aria-selected={activeMetricResolved === tab.key}
              className={activeMetricResolved === tab.key ? "is-active" : undefined}
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

      {activeMetricResolved === "market-value" ? (
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
          <button
            type="button"
            role="tab"
            aria-selected={activeMarketValueView === "relative-rate"}
            className={activeMarketValueView === "relative-rate" ? "is-active" : undefined}
            onClick={() => {
              setActiveMarketValueView("relative-rate");
            }}
          >
            変化率
          </button>
        </div>
      ) : null}

      {activeMetricResolved === "gain" ? (
        <div
          className="analysis-axis-tabs trend-metric-tabs__subtabs"
          role="tablist"
          aria-label="損益の表示"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeGainView === "level"}
            className={activeGainView === "level" ? "is-active" : undefined}
            onClick={() => {
              setActiveGainView("level");
            }}
          >
            推移
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeGainView === "delta"}
            className={activeGainView === "delta" ? "is-active" : undefined}
            onClick={() => {
              setActiveGainView("delta");
            }}
          >
            増減
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeGainView === "relative-rate"}
            className={activeGainView === "relative-rate" ? "is-active" : undefined}
            onClick={() => {
              setActiveGainView("relative-rate");
            }}
          >
            変化率
          </button>
        </div>
      ) : null}

      {activeMetricResolved === "gain-rate" ? (
        <div
          className="analysis-axis-tabs trend-metric-tabs__subtabs"
          role="tablist"
          aria-label="利益率の表示"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeGainRateView === "level"}
            className={activeGainRateView === "level" ? "is-active" : undefined}
            onClick={() => {
              setActiveGainRateView("level");
            }}
          >
            推移
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeGainRateView === "delta"}
            className={activeGainRateView === "delta" ? "is-active" : undefined}
            onClick={() => {
              setActiveGainRateView("delta");
            }}
          >
            増減
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeGainRateView === "relative-rate"}
            className={activeGainRateView === "relative-rate" ? "is-active" : undefined}
            onClick={() => {
              setActiveGainRateView("relative-rate");
            }}
          >
            変化率
          </button>
          {gainRateSeries.length > 1
            ? gainRateSeries.map((series) => {
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
              })
            : null}
        </div>
      ) : null}

      <div role="tabpanel">{chartPanel}</div>
    </section>
  );
  return result;
}
