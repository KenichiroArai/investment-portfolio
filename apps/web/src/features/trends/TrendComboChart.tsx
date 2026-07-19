"use client";

import {
  buildNiceAxisScale,
  resolveTrendSeriesValueDomain,
} from "@repo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { TrendChartHeader } from "@/features/trends/TrendChartHeader";
import {
  TrendChartExpandButton,
  TrendChartExpandDialog,
} from "@/features/trends/TrendChartExpandShell";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  EXPANDED_TREND_CHART_HEIGHT,
  type TrendChartLayoutMode,
} from "@/features/trends/trend-chart-layout";
import {
  resolveVisibleTrendXLabelIndexes,
  resolveXLabelAnchor,
} from "@/features/trends/resolve-trend-chart-slot-width";
import { formatTrendChartTooltipValue } from "@/features/trends/format-trend-chart-tooltip";
import { formatAsOfDateJa, formatYenManAxis } from "@/lib/format-yen";

type TrendComboChartProps = {
  labels: string[];
  sourceDates?: string[];
  sourceDateLabels?: string[];
  /** 評価額など（積み上げ棒）。口座ごとの色分けを想定 */
  barSeries: TrendChartSeries[];
  /** 利益率など（折れ線）。口座ごとの色分けを想定 */
  lineSeries: TrendChartSeries[];
  height?: number;
  className?: string;
  /** プロット領域の目標幅（この幅にスロットを収める） */
  targetPlotWidth?: number;
  /** 少なくともこの本数分の間隔で詰める（例: 12で1年分） */
  reservedSlotCount?: number;
  title?: string;
  titleLevel?: "h2" | "h3";
  caption?: string;
  layoutMode?: TrendChartLayoutMode;
};

const CHART_HEIGHT = 240;
const PADDING = { top: 16, right: 40, bottom: 40, left: 40 };
const POINT_RADIUS = 3;
const DEFAULT_TARGET_PLOT_WIDTH = 360;

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

function formatPercentAxisNumber(ratio: number): string {
  let result = "0";
  if (!Number.isFinite(ratio)) {
    return result;
  }
  result = (ratio * 100).toFixed(1);
  return result;
}

function resolveTooltipTransform(
  index: number,
  labelCount: number,
  reservedSlotCount: number,
): string {
  let result = "translateX(-50%)";
  const slotCount = Math.max(labelCount, reservedSlotCount, 1);
  const centerRatio = (index + 0.5) / slotCount;

  if (centerRatio <= 0.25) {
    result = "translateX(0)";
    return result;
  }

  if (centerRatio >= 0.75) {
    result = "translateX(-100%)";
    return result;
  }

  return result;
}

function buildLineSegments(
  values: Array<number | null>,
  valueToX: (index: number) => number,
  valueToY: (value: number) => number,
): string[] {
  let result: string[] = [];
  let currentSegment: string[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === null || !Number.isFinite(value)) {
      if (currentSegment.length > 0) {
        result.push(currentSegment.join(" "));
        currentSegment = [];
      }
      continue;
    }

    const point = `${valueToX(index)},${valueToY(value)}`;
    currentSegment.push(point);
  }

  if (currentSegment.length > 0) {
    result.push(currentSegment.join(" "));
  }

  return result;
}

function filterActiveSeries(series: TrendChartSeries[]): TrendChartSeries[] {
  let result: TrendChartSeries[] = [];
  result = series.filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );
  return result;
}

export function TrendComboChart({
  labels,
  sourceDates = [],
  sourceDateLabels,
  barSeries,
  lineSeries,
  height = CHART_HEIGHT,
  className,
  targetPlotWidth = DEFAULT_TARGET_PLOT_WIDTH,
  reservedSlotCount = 1,
  title,
  titleLevel = "h3",
  caption,
  layoutMode = "inline",
}: TrendComboChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const plotHeight = height - PADDING.top - PADDING.bottom;
  const resolvedTargetPlotWidth =
    layoutMode === "expanded"
      ? Math.max(320, targetPlotWidth - PADDING.left - PADDING.right)
      : targetPlotWidth;
  const slotDenominator = Math.max(labels.length, reservedSlotCount, 1);
  const slotWidth = resolvedTargetPlotWidth / slotDenominator;
  const plotWidth = resolvedTargetPlotWidth;
  const chartWidth = plotWidth + PADDING.left + PADDING.right;
  const visibleLabelIndexes =
    layoutMode === "expanded"
      ? new Set(resolveVisibleTrendXLabelIndexes(labels, slotWidth))
      : null;
  const showPointMarkers = slotWidth >= 10;
  const showExpand = layoutMode === "inline";
  const expandTitle = title ?? "評価額と利益率の複合グラフ";

  const activeBarSeries = filterActiveSeries(barSeries);
  const activeLineSeries = filterActiveSeries(lineSeries);
  const barActive = activeBarSeries.length > 0;
  const lineActive = activeLineSeries.length > 0;

  const barDomain = useMemo(() => {
    let result = { min: 0, max: 1, ticks: [0, 1] };
    if (!barActive) {
      return result;
    }

    let rawMin = 0;
    let rawMax = 0;
    for (let bucketIndex = 0; bucketIndex < labels.length; bucketIndex += 1) {
      let positiveSum = 0;
      for (const item of activeBarSeries) {
        const value = item.values[bucketIndex];
        if (value === null || !Number.isFinite(value) || value <= 0) {
          continue;
        }
        positiveSum += value;
      }
      rawMax = Math.max(rawMax, positiveSum);
    }

    const scale = buildNiceAxisScale(rawMin, Math.max(rawMax, 1));
    result = {
      min: scale.min,
      max: scale.max,
      ticks: scale.ticks,
    };
    return result;
  }, [activeBarSeries, barActive, labels.length]);

  const lineDomain = useMemo(() => {
    let result = { min: 0, max: 1, ticks: [0, 1] };
    if (!lineActive) {
      return result;
    }
    const resolved = resolveTrendSeriesValueDomain(
      activeLineSeries,
      "includeZero",
    );
    const scale = buildNiceAxisScale(resolved.min, resolved.max);
    result = {
      min: scale.min,
      max: scale.max,
      ticks: scale.ticks,
    };
    return result;
  }, [activeLineSeries, lineActive]);

  const valueToBarY = (value: number): number => {
    let result = plotHeight;
    const range = barDomain.max - barDomain.min || 1;
    result = plotHeight - ((value - barDomain.min) / range) * plotHeight;
    return result;
  };

  const valueToLineY = (value: number): number => {
    let result = plotHeight;
    const range = lineDomain.max - lineDomain.min || 1;
    result = plotHeight - ((value - lineDomain.min) / range) * plotHeight;
    return result;
  };

  const valueToX = (index: number): number => {
    let result = slotWidth / 2;
    result = index * slotWidth + slotWidth / 2;
    return result;
  };

  let result: ReactNode = null;

  if (labels.length === 0 || (!barActive && !lineActive)) {
    result = <p className="trend-chart__empty">表示できるデータがありません。</p>;
    return result;
  }

  const zeroBarY = valueToBarY(0);
  const legendSeries = [...activeBarSeries];

  result = (
    <>
      <div
        className={className ? `trend-combo-chart ${className}` : "trend-combo-chart"}
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
        <div className="trend-combo-chart__scroll">
          <svg
            viewBox={`0 0 ${chartWidth} ${height}`}
            className="trend-combo-chart__svg"
            role="img"
            aria-label="評価額と利益率の複合グラフ"
            style={{ width: "100%", height: "auto" }}
          >
          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            {barDomain.ticks.map((tick, tickIndex) => {
              const y = valueToBarY(tick);
              let gridLine = (
                <g key={`bar-${tickIndex}-${tick}`}>
                  <line
                    x1={0}
                    y1={y}
                    x2={plotWidth}
                    y2={y}
                    className="trend-combo-chart__grid"
                  />
                  <text
                    x={-6}
                    y={y + 4}
                    textAnchor="end"
                    className="trend-combo-chart__y-label"
                  >
                    {formatYenManAxis(tick)}
                  </text>
                </g>
              );
              return gridLine;
            })}
            {lineActive
              ? lineDomain.ticks.map((tick, tickIndex) => {
                  const y = valueToLineY(tick);
                  let axisLabel = (
                    <text
                      key={`line-${tickIndex}-${tick}`}
                      x={plotWidth + 6}
                      y={y + 4}
                      textAnchor="start"
                      className="trend-combo-chart__y-label trend-combo-chart__y-label--secondary"
                    >
                      {formatPercentAxisNumber(tick)}
                    </text>
                  );
                  return axisLabel;
                })
              : null}
            <line
              x1={0}
              y1={zeroBarY}
              x2={plotWidth}
              y2={zeroBarY}
              className="trend-combo-chart__axis"
            />
            {barActive
              ? labels.map((label, bucketIndex) => {
                  const slotX = bucketIndex * slotWidth;
                  const barWidth = Math.min(28, Math.max(4, slotWidth * 0.55));
                  const barX = slotX + (slotWidth - barWidth) / 2;
                  let stackTop = plotHeight;
                  const segments: Array<{
                    key: string;
                    color: string;
                    y: number;
                    height: number;
                  }> = [];

                  for (const item of activeBarSeries) {
                    const value = item.values[bucketIndex];
                    if (value === null || !Number.isFinite(value) || value <= 0) {
                      continue;
                    }
                    const segmentHeight =
                      (value / Math.max(barDomain.max, 0.0001)) * plotHeight;
                    stackTop -= segmentHeight;
                    segments.push({
                      key: item.key,
                      color: item.color,
                      y: stackTop,
                      height: Math.max(1, segmentHeight),
                    });
                  }

                  let barGroup = (
                    <g key={`bars-${label}-${bucketIndex}`}>
                      {segments.map((segment) => {
                        let rect = (
                          <rect
                            key={`${label}-${segment.key}`}
                            x={barX}
                            y={segment.y}
                            width={barWidth}
                            height={segment.height}
                            fill={segment.color}
                            className="trend-combo-chart__bar"
                          />
                        );
                        return rect;
                      })}
                    </g>
                  );
                  return barGroup;
                })
              : null}
            {activeLineSeries.map((item) => {
              const segments = buildLineSegments(
                item.values,
                valueToX,
                valueToLineY,
              );
              let lineGroup = (
                <g key={`line-${item.key}`}>
                  {segments.map((segment, segmentIndex) => {
                    let polyline = (
                      <polyline
                        key={`${item.key}-${segmentIndex}`}
                        points={segment}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={2}
                        className="trend-combo-chart__line"
                      />
                    );
                    return polyline;
                  })}
                  {showPointMarkers
                    ? item.values.map((value, bucketIndex) => {
                        if (value === null || !Number.isFinite(value)) {
                          return null;
                        }
                        let point = (
                          <circle
                            key={`${item.key}-pt-${bucketIndex}`}
                            cx={valueToX(bucketIndex)}
                            cy={valueToLineY(value)}
                            r={POINT_RADIUS}
                            fill={item.color}
                            className="trend-combo-chart__point"
                          />
                        );
                        return point;
                      })
                    : null}
                </g>
              );
              return lineGroup;
            })}
            {labels.map((label, bucketIndex) => {
              const centerX = valueToX(bucketIndex);
              const anchor = resolveXLabelAnchor(bucketIndex, labels.length);
              const showLabel =
                visibleLabelIndexes === null || visibleLabelIndexes.has(bucketIndex);
              let bucket = (
                <g key={`slot-${label}-${bucketIndex}`}>
                  <rect
                    x={bucketIndex * slotWidth}
                    y={0}
                    width={slotWidth}
                    height={plotHeight}
                    fill="transparent"
                    className="trend-combo-chart__hit"
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
                      y={plotHeight + 20}
                      textAnchor={anchor}
                      className="trend-combo-chart__x-label"
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
          className="trend-combo-chart__tooltip"
          style={{
            left: `${PADDING.left + hoveredIndex * slotWidth + slotWidth / 2}px`,
            transform: resolveTooltipTransform(
              hoveredIndex,
              labels.length,
              reservedSlotCount,
            ),
          }}
        >
          <div className="trend-combo-chart__tooltip-title">
            {labels[hoveredIndex]}月
          </div>
          {formatSourceDateTooltip(
            sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
          ) ? (
            <div className="trend-combo-chart__tooltip-date">
              {formatSourceDateTooltip(
                sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
              )}
            </div>
          ) : null}
          {[...activeBarSeries, ...activeLineSeries].map((item) => {
            const value = item.values[hoveredIndex];
            if (value === null || !Number.isFinite(value)) {
              return null;
            }
            const formatted = formatTrendChartTooltipValue(item, hoveredIndex);
            if (formatted === null) {
              return null;
            }
            const isLine = activeLineSeries.some(
              (lineItem) => lineItem.key === item.key,
            );
            let row = (
              <div key={item.key} className="trend-combo-chart__tooltip-row">
                <span
                  className="trend-combo-chart__tooltip-swatch"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
                {isLine ? "（利益率）" : "（評価額）"}: {formatted}
              </div>
            );
            return row;
          })}
        </div>
      ) : null}
      <div className="trend-combo-chart__legend">
        {legendSeries.map((item) => {
          let legend = (
            <span key={item.key} className="trend-combo-chart__legend-item">
              <span
                className="trend-combo-chart__legend-swatch"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
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
            <TrendComboChart
              labels={labels}
              sourceDates={sourceDates}
              sourceDateLabels={sourceDateLabels}
              barSeries={barSeries}
              lineSeries={lineSeries}
              height={EXPANDED_TREND_CHART_HEIGHT}
              className={className}
              targetPlotWidth={measuredWidth}
              reservedSlotCount={reservedSlotCount}
              layoutMode="expanded"
            />
          )}
        </TrendChartExpandDialog>
      ) : null}
    </>
  );
  return result;
}
