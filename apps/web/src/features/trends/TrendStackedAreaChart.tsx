"use client";

import { useMemo, useState, type ReactNode } from "react";

import { TrendChartHeader } from "@/features/trends/TrendChartHeader";
import {
  TrendChartExpandButton,
  TrendChartExpandDialog,
} from "@/features/trends/TrendChartExpandShell";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  EXPANDED_TREND_CHART_HEIGHT,
  resolveTrendChartPlotLayout,
  type TrendChartLayoutMode,
} from "@/features/trends/trend-chart-layout";
import { resolveXLabelAnchor } from "@/features/trends/resolve-trend-chart-slot-width";
import {
  formatAsOfDateJa,
  formatPercent,
  formatPercentLevelDeltaTooltip,
  resolveTrendTooltipPrevious,
} from "@/lib/format-yen";

export type TrendStackedAreaSeries = TrendChartSeries & {
  otherMembers?: string[];
};

function formatSourceDateTooltip(label: string | undefined): string | null {
  let result: string | null = null;
  if (!label) {
    return result;
  }
  if (label === "期間平均") {
    result = label;
    return result;
  }
  result = `基準日: ${formatAsOfDateJa(label)}`;
  return result;
}

type TrendStackedAreaChartProps = {
  labels: string[];
  sourceDates?: string[];
  sourceDateLabels?: string[];
  series: TrendStackedAreaSeries[];
  height?: number;
  className?: string;
  title?: string;
  titleLevel?: "h2" | "h3";
  caption?: string;
  selectedSeriesKeys?: string[];
  onSeriesToggle?: (key: string) => void;
  layoutMode?: TrendChartLayoutMode;
  targetPlotWidth?: number;
};

const CHART_HEIGHT = 280;
const PADDING = { top: 16, right: 16, bottom: 48, left: 56 };
const MIN_VALUE = 0;
const MAX_VALUE = 1;
const Y_AXIS_TICKS = [0, 0.25, 0.5, 0.75, 1];

function resolveStackBounds(
  allSeries: TrendStackedAreaSeries[],
  seriesIndex: number,
  bucketIndex: number,
): { bottom: number; top: number } | null {
  let result: { bottom: number; top: number } | null = null;
  const current = allSeries[seriesIndex]?.values[bucketIndex];
  if (current === null || !Number.isFinite(current) || current <= 0) {
    return result;
  }

  let bottom = 0;
  for (let index = 0; index < seriesIndex; index += 1) {
    const value = allSeries[index]?.values[bucketIndex];
    if (value !== null && Number.isFinite(value) && value > 0) {
      bottom += value;
    }
  }

  result = {
    bottom,
    top: bottom + current,
  };
  return result;
}

function buildAreaPath(
  allSeries: TrendStackedAreaSeries[],
  seriesIndex: number,
  bucketIndex: number,
  valueToX: (index: number) => number,
  valueToY: (value: number) => number,
): string | null {
  let result: string | null = null;
  const start = resolveStackBounds(allSeries, seriesIndex, bucketIndex);
  const end = resolveStackBounds(allSeries, seriesIndex, bucketIndex + 1);
  if (!start || !end) {
    return result;
  }

  const x0 = valueToX(bucketIndex);
  const x1 = valueToX(bucketIndex + 1);
  result = [
    `M ${x0} ${valueToY(start.bottom)}`,
    `L ${x0} ${valueToY(start.top)}`,
    `L ${x1} ${valueToY(end.top)}`,
    `L ${x1} ${valueToY(end.bottom)}`,
    "Z",
  ].join(" ");
  return result;
}

export function TrendStackedAreaChart({
  labels,
  sourceDates = [],
  sourceDateLabels,
  series,
  height = CHART_HEIGHT,
  className,
  title,
  titleLevel = "h2",
  caption,
  selectedSeriesKeys = [],
  onSeriesToggle,
  layoutMode = "inline",
  targetPlotWidth,
}: TrendStackedAreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const plotHeight = height - PADDING.top - PADDING.bottom;
  const plotLayout = resolveTrendChartPlotLayout({
    labels,
    layoutMode,
    targetPlotWidth,
    paddingLeft: PADDING.left,
    paddingRight: PADDING.right,
  });
  const { pointSlotWidth, plotWidth, visibleLabelIndexes } = plotLayout;
  const chartWidth = plotWidth + PADDING.left + PADDING.right;
  const showExpand = layoutMode === "inline";
  const expandTitle = title ?? "構成比積み上げエリアグラフ";

  const activeSeries = useMemo(() => {
    let result = series.filter((item) =>
      item.values.some((value) => value !== null && Number.isFinite(value) && value > 0),
    );
    return result;
  }, [series]);

  const valueToY = (value: number): number => {
    let result = plotHeight;
    const range = MAX_VALUE - MIN_VALUE || 1;
    result = plotHeight - ((value - MIN_VALUE) / range) * plotHeight;
    return result;
  };

  const valueToX = (index: number): number => {
    let result = pointSlotWidth / 2;
    result = index * pointSlotWidth + pointSlotWidth / 2;
    return result;
  };

  let result: ReactNode = null;

  if (labels.length === 0 || activeSeries.length === 0) {
    result = <p className="trend-chart__empty">表示できるデータがありません。</p>;
    return result;
  }

  result = (
    <>
      <div
        className={
          className ? `trend-stacked-area-chart ${className}` : "trend-stacked-area-chart"
        }
      >
        {title ? (
          <TrendChartHeader
            title={title}
            titleLevel={titleLevel}
            caption={caption}
            actions={
              showExpand ? (
                <TrendChartExpandButton
                  onClick={() => {
                    setExpanded(true);
                  }}
                />
              ) : null
            }
          />
        ) : null}
        <div className="trend-stacked-area-chart__scroll">
          <div className="trend-stacked-area-chart__canvas" style={{ width: chartWidth }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${height}`}
              width={chartWidth}
              height={height}
              className="trend-stacked-area-chart__svg"
              role="img"
              aria-label="構成比積み上げエリアグラフ"
            >
          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            {Y_AXIS_TICKS.map((tick) => {
              const y = valueToY(tick);
              let gridLine = (
                <g key={tick}>
                  <line
                    x1={0}
                    y1={y}
                    x2={plotWidth}
                    y2={y}
                    className="trend-stacked-area-chart__grid"
                  />
                  <text
                    x={-8}
                    y={y + 4}
                    textAnchor="end"
                    className="trend-stacked-area-chart__y-label"
                  >
                    {formatPercent(tick)}
                  </text>
                </g>
              );
              return gridLine;
            })}
            {activeSeries.map((item, seriesIndex) => {
              if (labels.length === 1) {
                const bounds = resolveStackBounds(activeSeries, seriesIndex, 0);
                if (!bounds) {
                  return null;
                }

                const barWidth = Math.min(pointSlotWidth * 0.5, 56);
                const barX = pointSlotWidth / 2 - barWidth / 2;
                const yTop = valueToY(bounds.top);
                const yBottom = valueToY(bounds.bottom);

                let singleBar = (
                  <rect
                    key={item.key}
                    x={barX}
                    y={yTop}
                    width={barWidth}
                    height={Math.max(0, yBottom - yTop)}
                    fill={item.color}
                    fillOpacity={0.85}
                    stroke={item.color}
                    strokeWidth={0.5}
                    className="trend-stacked-area-chart__area"
                  />
                );
                return singleBar;
              }

              const paths: string[] = [];
              for (let bucketIndex = 0; bucketIndex < labels.length - 1; bucketIndex += 1) {
                const path = buildAreaPath(
                  activeSeries,
                  seriesIndex,
                  bucketIndex,
                  valueToX,
                  valueToY,
                );
                if (path) {
                  paths.push(path);
                }
              }

              let areaGroup = (
                <g key={item.key}>
                  {paths.map((path, pathIndex) => {
                    let area = (
                      <path
                        key={`${item.key}-${pathIndex}`}
                        d={path}
                        fill={item.color}
                        fillOpacity={0.85}
                        stroke={item.color}
                        strokeWidth={0.5}
                        className="trend-stacked-area-chart__area"
                      />
                    );
                    return area;
                  })}
                </g>
              );
              return areaGroup;
            })}
            {labels.map((label, bucketIndex) => {
              const centerX = valueToX(bucketIndex);
              const anchor = resolveXLabelAnchor(bucketIndex, labels.length);
              const showLabel =
                visibleLabelIndexes === null || visibleLabelIndexes.has(bucketIndex);

              let bucket = (
                <g key={`${label}-${bucketIndex}`}>
                  <rect
                    x={bucketIndex * pointSlotWidth}
                    y={0}
                    width={pointSlotWidth}
                    height={plotHeight}
                    fill="transparent"
                    className="trend-stacked-area-chart__hit"
                    onMouseEnter={() => {
                      setHoveredIndex(bucketIndex);
                    }}
                    onMouseLeave={() => {
                      setHoveredIndex(null);
                    }}
                    onFocus={() => {
                      setHoveredIndex(bucketIndex);
                    }}
                    onBlur={() => {
                      setHoveredIndex(null);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${label} の詳細`}
                  />
                  {showLabel ? (
                    <text
                      x={centerX}
                      y={plotHeight + 24}
                      textAnchor={anchor}
                      className="trend-stacked-area-chart__x-label"
                    >
                      {label}
                    </text>
                  ) : null}
                </g>
              );
              return bucket;
            })}
          </g>
        </svg>
          </div>
        {hoveredIndex !== null ? (
          <div
            className="trend-stacked-area-chart__tooltip"
            style={{
              left: `${PADDING.left + hoveredIndex * pointSlotWidth + pointSlotWidth / 2}px`,
            }}
          >
            <div className="trend-stacked-area-chart__tooltip-title">
              {labels[hoveredIndex]}
            </div>
            {formatSourceDateTooltip(
              sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
            ) ? (
              <div className="trend-stacked-area-chart__tooltip-date">
                {formatSourceDateTooltip(
                  sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
                )}
              </div>
            ) : null}
            {activeSeries.map((item) => {
              const value = item.values[hoveredIndex];
              if (value === null || !Number.isFinite(value) || value <= 0) {
                return null;
              }

              const previous = resolveTrendTooltipPrevious(
                item.values,
                hoveredIndex,
                item.baselineValue,
              );
              const current = item.values[hoveredIndex];
              let formatted = formatPercentLevelDeltaTooltip(previous, current);

              if (previous === null || !Number.isFinite(previous ?? NaN)) {
                formatted = item.formatValue
                  ? item.formatValue(value)
                  : formatPercent(value);
              }

              let row = (
                <div key={item.key} className="trend-stacked-area-chart__tooltip-row">
                  <span
                    className="trend-stacked-area-chart__tooltip-swatch"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}: {formatted}
                </div>
              );
              return row;
            })}
            {activeSeries.some(
              (item) =>
                item.otherMembers &&
                item.otherMembers.length > 0 &&
                item.values[hoveredIndex] !== null &&
                Number.isFinite(item.values[hoveredIndex]),
            ) ? (
              <div className="trend-stacked-area-chart__tooltip-other">
                {activeSeries
                  .filter((item) => item.otherMembers && item.otherMembers.length > 0)
                  .flatMap((item) => item.otherMembers ?? [])
                  .join("、")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="trend-stacked-area-chart__legend">
        {activeSeries.map((item) => {
          const isSelected = selectedSeriesKeys.includes(item.key);
          const otherTitle =
            item.otherMembers && item.otherMembers.length > 0
              ? item.otherMembers.join("、")
              : undefined;
          let legend = (
            <button
              key={item.key}
              type="button"
              className={
                isSelected
                  ? "trend-stacked-area-chart__legend-item trend-stacked-area-chart__legend-item--selected"
                  : "trend-stacked-area-chart__legend-item"
              }
              title={otherTitle}
              aria-pressed={isSelected}
              onClick={() => {
                if (onSeriesToggle) {
                  onSeriesToggle(item.key);
                }
              }}
              disabled={!onSeriesToggle}
            >
              <span
                className="trend-stacked-area-chart__legend-swatch"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
              {item.otherMembers && item.otherMembers.length > 0
                ? `（${item.otherMembers.length}件）`
                : null}
            </button>
          );
          return legend;
        })}
      </div>
      </div>
      {showExpand ? (
        <TrendChartExpandDialog
          open={expanded}
          onOpenChange={setExpanded}
          title={expandTitle}
        >
          {(measuredWidth) => (
            <TrendStackedAreaChart
              labels={labels}
              sourceDates={sourceDates}
              sourceDateLabels={sourceDateLabels}
              series={series}
              height={EXPANDED_TREND_CHART_HEIGHT}
              className={className}
              selectedSeriesKeys={selectedSeriesKeys}
              onSeriesToggle={onSeriesToggle}
              layoutMode="expanded"
              targetPlotWidth={measuredWidth}
            />
          )}
        </TrendChartExpandDialog>
      ) : null}
    </>
  );
  return result;
}
