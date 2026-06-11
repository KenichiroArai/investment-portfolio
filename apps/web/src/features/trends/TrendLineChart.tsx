"use client";

import {
  buildNiceAxisScale,
  resolveTrendSeriesValueDomain,
  type TrendChartDomainMode,
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
import { formatAsOfDateJa, formatPercentDeltaTooltip } from "@/lib/format-yen";

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

type TrendLineChartProps = {
  labels: string[];
  sourceDates?: string[];
  sourceDateLabels?: string[];
  series: TrendChartSeries[];
  height?: number;
  className?: string;
  valueDomain?: { min: number; max: number };
  domainMode?: TrendChartDomainMode;
  formatYAxis?: (value: number) => string;
  valueKind?: TrendChartValueKind;
  title?: string;
  titleLevel?: "h2" | "h3";
  caption?: string;
};

const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 48, left: 88 };
const POINT_RADIUS = 4;

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

export function TrendLineChart({
  labels,
  sourceDates = [],
  sourceDateLabels,
  series,
  height = CHART_HEIGHT,
  className,
  valueDomain,
  domainMode = "includeZero",
  formatYAxis,
  valueKind,
  title,
  titleLevel = "h3",
  caption,
}: TrendLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotHeight = height - PADDING.top - PADDING.bottom;
  const pointSlotWidth = resolveTrendChartSlotWidth(labels);
  const plotWidth = Math.max(320, pointSlotWidth * labels.length);
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
      const resolvedDomain = resolveTrendSeriesValueDomain(activeSeries, domainMode);
      rawMin = resolvedDomain.min;
      rawMax = resolvedDomain.max;

      if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
        rawMin = 0;
        rawMax = 1;
      }
    }

    const scale = buildNiceAxisScale(rawMin, rawMax);
    let result = {
      minValue: scale.min,
      maxValue: scale.max,
      yAxisTicks: scale.ticks,
    };
    return result;
  }, [activeSeries, domainMode, valueDomain]);

  const valueToY = (value: number): number => {
    let result = plotHeight;
    const range = maxValue - minValue || 1;
    result = plotHeight - ((value - minValue) / range) * plotHeight;
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

  const zeroY = valueToY(0);

  result = (
    <div className={className ? `trend-line-chart ${className}` : "trend-line-chart"}>
      {title ? (
        <TrendChartHeader title={title} titleLevel={titleLevel} caption={caption} />
      ) : null}
      <div className="trend-line-chart__scroll">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="trend-line-chart__svg"
          role="img"
          aria-label="推移折れ線グラフ"
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
                    className="trend-line-chart__grid"
                  />
                  <text
                    x={-8}
                    y={y + 4}
                    textAnchor="end"
                    className="trend-line-chart__y-label"
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
              className="trend-line-chart__axis"
            />
            {activeSeries.map((item) => {
              const segments = buildLineSegments(item.values, valueToX, valueToY);
              let lineGroup = (
                <g key={item.key}>
                  {segments.map((segment, segmentIndex) => {
                    let polyline = (
                      <polyline
                        key={`${item.key}-${segmentIndex}`}
                        points={segment}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={2}
                        className="trend-line-chart__line"
                      />
                    );
                    return polyline;
                  })}
                  {item.values.map((value, bucketIndex) => {
                    if (value === null || !Number.isFinite(value)) {
                      return null;
                    }
                    let point = (
                      <circle
                        key={`${item.key}-${bucketIndex}`}
                        cx={valueToX(bucketIndex)}
                        cy={valueToY(value)}
                        r={POINT_RADIUS}
                        fill={item.color}
                        className="trend-line-chart__point"
                      />
                    );
                    return point;
                  })}
                </g>
              );
              return lineGroup;
            })}
            {labels.map((label, bucketIndex) => {
              const centerX = valueToX(bucketIndex);
              const anchor = resolveXLabelAnchor(bucketIndex, labels.length);

              let bucket = (
                <g key={`${label}-${bucketIndex}`}>
                  <rect
                    x={bucketIndex * pointSlotWidth}
                    y={0}
                    width={pointSlotWidth}
                    height={plotHeight}
                    fill="transparent"
                    className="trend-line-chart__hit"
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
                    className="trend-line-chart__x-label"
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
            className="trend-line-chart__tooltip"
            style={{
              left: `${PADDING.left + hoveredIndex * pointSlotWidth + pointSlotWidth / 2}px`,
            }}
          >
            <div className="trend-line-chart__tooltip-title">{labels[hoveredIndex]}</div>
            {formatSourceDateTooltip(
              sourceDateLabels?.[hoveredIndex] ?? sourceDates[hoveredIndex],
            ) ? (
              <div className="trend-line-chart__tooltip-date">
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

              let formatted = item.formatValue
                ? item.formatValue(value)
                : String(value);

              if (
                item.tooltipMode === "percentDelta" &&
                item.levelValues &&
                hoveredIndex > 0
              ) {
                const previous = item.levelValues[hoveredIndex - 1];
                const current = item.levelValues[hoveredIndex];
                formatted = formatPercentDeltaTooltip(previous, current);
              }

              let row = (
                <div key={item.key} className="trend-line-chart__tooltip-row">
                  <span
                    className="trend-line-chart__tooltip-swatch"
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
      <div className="trend-line-chart__legend">
        {activeSeries.map((item) => {
          let legend = (
            <span key={item.key} className="trend-line-chart__legend-item">
              <span
                className="trend-line-chart__legend-swatch"
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
