"use client";

import {
  buildNiceAxisScale,
  type TrendChartValueKind,
} from "@repo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { TrendChartHeader } from "@/features/trends/TrendChartHeader";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import {
  resolveTrendChartSlotWidth,
  resolveXLabelAnchor,
} from "@/features/trends/resolve-trend-chart-slot-width";
import { useTrendYAxis } from "@/features/trends/use-trend-y-axis";
import { formatTrendChartTooltipValue } from "@/features/trends/format-trend-chart-tooltip";
import { formatAsOfDateJa } from "@/lib/format-yen";

export type TrendBarSeries = TrendChartSeries;

type TrendBarChartMode = "grouped" | "stacked";

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

type TrendBarChartProps = {
  labels: string[];
  sourceDates?: string[];
  sourceDateLabels?: string[];
  series: TrendBarSeries[];
  mode?: TrendBarChartMode;
  height?: number;
  className?: string;
  valueDomain?: { min: number; max: number };
  formatYAxis?: (value: number) => string;
  valueKind?: TrendChartValueKind;
  title?: string;
  titleLevel?: "h2" | "h3";
  caption?: string;
};

const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 48, left: 88 };

export function TrendBarChart({
  labels,
  sourceDates = [],
  sourceDateLabels,
  series,
  mode = "grouped",
  height = CHART_HEIGHT,
  className,
  valueDomain,
  formatYAxis,
  valueKind,
  title,
  titleLevel = "h2",
  caption,
}: TrendBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotHeight = height - PADDING.top - PADDING.bottom;
  const barSlotWidth = resolveTrendChartSlotWidth(labels);
  const plotWidth = Math.max(320, barSlotWidth * labels.length);
  const chartWidth = plotWidth + PADDING.left + PADDING.right;

  const activeSeries = series.filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );
  const yAxis = useTrendYAxis(activeSeries, valueKind, formatYAxis);

  const { minValue, maxValue, yAxisTicks } = useMemo(() => {
    let rawMin = Number.POSITIVE_INFINITY;
    let rawMax = Number.NEGATIVE_INFINITY;

    if (valueDomain) {
      rawMin = valueDomain.min;
      rawMax = valueDomain.max;
    } else {
      for (let bucketIndex = 0; bucketIndex < labels.length; bucketIndex += 1) {
        if (mode === "stacked") {
          let positiveSum = 0;
          let negativeSum = 0;
          for (const item of activeSeries) {
            const value = item.values[bucketIndex];
            if (value === null || !Number.isFinite(value)) {
              continue;
            }
            if (value >= 0) {
              positiveSum += value;
            } else {
              negativeSum += value;
            }
          }
          rawMin = Math.min(rawMin, negativeSum, 0);
          rawMax = Math.max(rawMax, positiveSum, 0);
          continue;
        }

        for (const item of activeSeries) {
          const value = item.values[bucketIndex];
          if (value === null || !Number.isFinite(value)) {
            continue;
          }
          rawMin = Math.min(rawMin, value);
          rawMax = Math.max(rawMax, value);
        }
      }

      if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
        rawMin = 0;
        rawMax = 1;
      }
      if (rawMin > 0) {
        rawMin = 0;
      }
      if (rawMax < 0) {
        rawMax = 0;
      }
    }

    const scale = buildNiceAxisScale(rawMin, rawMax);
    let result = {
      minValue: scale.min,
      maxValue: scale.max,
      yAxisTicks: scale.ticks,
    };
    return result;
  }, [activeSeries, labels.length, mode, valueDomain]);

  const valueToY = (value: number): number => {
    let result = plotHeight;
    const range = maxValue - minValue || 1;
    result = plotHeight - ((value - minValue) / range) * plotHeight;
    return result;
  };

  let result: ReactNode = null;

  if (labels.length === 0 || activeSeries.length === 0) {
    result = <p className="trend-chart__empty">表示できるデータがありません。</p>;
    return result;
  }

  const zeroY = valueToY(0);

  result = (
    <div className={className ? `trend-bar-chart ${className}` : "trend-bar-chart"}>
      {title ? (
        <TrendChartHeader title={title} titleLevel={titleLevel} caption={caption} />
      ) : null}
      <div className="trend-bar-chart__scroll">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="trend-bar-chart__svg"
          role="img"
          aria-label="推移棒グラフ"
          style={{ minWidth: `${chartWidth}px` }}
        >
          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            {yAxisTicks.map((tick, tickIndex) => {
              const y = valueToY(tick);
              let gridLine = (
                <g key={`${tickIndex}-${tick}`}>
                  <line
                    x1={0}
                    y1={y}
                    x2={plotWidth}
                    y2={y}
                    className="trend-bar-chart__grid"
                  />
                  <text
                    x={-8}
                    y={y + 4}
                    textAnchor="end"
                    className="trend-bar-chart__y-label"
                  >
                    {yAxis.formatTick(tick)}
                  </text>
                </g>
              );
              return gridLine;
            })}
            <line
              x1={0}
              y1={zeroY}
              x2={plotWidth}
              y2={zeroY}
              className="trend-bar-chart__axis"
            />
            {labels.map((label, bucketIndex) => {
              const slotX = bucketIndex * barSlotWidth;
              const centerX = slotX + barSlotWidth / 2;
              const anchor = resolveXLabelAnchor(bucketIndex, labels.length);

              if (mode === "stacked") {
                const stackedSegments: Array<{
                  key: string;
                  color: string;
                  y: number;
                  height: number;
                }> = [];
                let stackTop = plotHeight;

                for (const item of activeSeries) {
                  const value = item.values[bucketIndex];
                  if (value === null || !Number.isFinite(value) || value <= 0) {
                    continue;
                  }
                  const segmentHeight = (value / Math.max(maxValue, 0.0001)) * plotHeight;
                  stackTop -= segmentHeight;
                  stackedSegments.push({
                    key: item.key,
                    color: item.color,
                    y: stackTop,
                    height: segmentHeight,
                  });
                }

                const barWidth = Math.min(40, barSlotWidth * 0.7);
                const barX = slotX + (barSlotWidth - barWidth) / 2;

                let bucket = (
                  <g key={`${label}-${bucketIndex}`}>
                    {stackedSegments.map((segment) => {
                      let rect = (
                        <rect
                          key={`${label}-${segment.key}`}
                          x={barX}
                          y={segment.y}
                          width={barWidth}
                          height={Math.max(1, segment.height)}
                          fill={segment.color}
                          className="trend-bar-chart__bar"
                        />
                      );
                      return rect;
                    })}
                    <rect
                      x={slotX}
                      y={0}
                      width={barSlotWidth}
                      height={plotHeight}
                      fill="transparent"
                      className="trend-bar-chart__hit"
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
                    <text
                      x={centerX}
                      y={plotHeight + 24}
                      textAnchor={anchor}
                      className="trend-bar-chart__x-label"
                    >
                      {label}
                    </text>
                  </g>
                );
                return bucket;
              }

              const groupWidth = Math.min(48, barSlotWidth * 0.8);
              const singleBarWidth = groupWidth / activeSeries.length;
              const groupX = slotX + (barSlotWidth - groupWidth) / 2;

              let bucket = (
                <g key={label}>
                  {activeSeries.map((item, seriesIndex) => {
                    const value = item.values[bucketIndex];
                    if (value === null || !Number.isFinite(value)) {
                      return null;
                    }
                    const barTop = valueToY(Math.max(value, 0));
                    const barBottom = valueToY(Math.min(value, 0));
                    const barHeight = Math.max(1, Math.abs(barBottom - barTop));
                    const barY = Math.min(barTop, barBottom);
                    let rect = (
                      <rect
                        key={`${label}-${item.key}`}
                        x={groupX + singleBarWidth * seriesIndex + 1}
                        y={barY}
                        width={Math.max(1, singleBarWidth - 2)}
                        height={barHeight}
                        fill={item.color}
                        className="trend-bar-chart__bar"
                      />
                    );
                    return rect;
                  })}
                  <rect
                    x={slotX}
                    y={0}
                    width={barSlotWidth}
                    height={plotHeight}
                    fill="transparent"
                    className="trend-bar-chart__hit"
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
                  <text
                    x={centerX}
                    y={plotHeight + 24}
                    textAnchor={anchor}
                    className="trend-bar-chart__x-label"
                  >
                    {label}
                  </text>
                </g>
              );
              return bucket;
            })}
          </g>
        </svg>
        {hoveredIndex !== null ? (
          <div
            className="trend-bar-chart__tooltip"
            style={{
              left: `${PADDING.left + hoveredIndex * barSlotWidth + barSlotWidth / 2}px`,
            }}
          >
            <div className="trend-bar-chart__tooltip-title">{labels[hoveredIndex]}</div>
            {formatSourceDateTooltip(
              sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
            ) ? (
              <div className="trend-bar-chart__tooltip-date">
                {formatSourceDateTooltip(
                  sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
                )}
              </div>
            ) : null}
            {activeSeries.map((item) => {
              const value = item.values[hoveredIndex];
              if (value === null || !Number.isFinite(value)) {
                return null;
              }

              const formatted = formatTrendChartTooltipValue(item, hoveredIndex);
              if (formatted === null) {
                return null;
              }

              let row = (
                <div key={item.key} className="trend-bar-chart__tooltip-row">
                  <span
                    className="trend-bar-chart__tooltip-swatch"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}: {formatted}
                </div>
              );
              return row;
            })}
          </div>
        ) : null}
      </div>
      <div className="trend-bar-chart__legend">
        {activeSeries.map((item) => {
          let legend = (
            <span key={item.key} className="trend-bar-chart__legend-item">
              <span
                className="trend-bar-chart__legend-swatch"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          );
          return legend;
        })}
      </div>
    </div>
  );
  return result;
}
