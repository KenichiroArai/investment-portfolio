"use client";

import { buildNiceAxisScale } from "@repo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { formatAsOfDateJa } from "@/lib/format-yen";

export type TrendBarSeries = {
  key: string;
  label: string;
  color: string;
  values: Array<number | null>;
  formatValue?: (value: number) => string;
};

type TrendBarChartMode = "grouped" | "stacked";

type TrendBarChartProps = {
  labels: string[];
  sourceDates?: string[];
  series: TrendBarSeries[];
  mode?: TrendBarChartMode;
  height?: number;
  className?: string;
  valueDomain?: { min: number; max: number };
  formatYAxis?: (value: number) => string;
};

const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 48, left: 72 };
const MIN_BAR_SLOT_WIDTH = 56;
const MAX_BAR_SLOT_WIDTH = 96;

function resolveXLabelAnchor(
  index: number,
  total: number,
): "start" | "middle" | "end" {
  let result: "start" | "middle" | "end" = "middle";
  if (index === 0) {
    result = "start";
    return result;
  }
  if (index === total - 1) {
    result = "end";
    return result;
  }
  return result;
}

export function TrendBarChart({
  labels,
  sourceDates = [],
  series,
  mode = "grouped",
  height = CHART_HEIGHT,
  className,
  valueDomain,
  formatYAxis,
}: TrendBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotHeight = height - PADDING.top - PADDING.bottom;
  const barSlotWidth = Math.min(
    MAX_BAR_SLOT_WIDTH,
    Math.max(MIN_BAR_SLOT_WIDTH, 640 / Math.max(labels.length, 1)),
  );
  const plotWidth = Math.max(320, barSlotWidth * labels.length);
  const chartWidth = plotWidth + PADDING.left + PADDING.right;

  const activeSeries = series.filter((item) =>
    item.values.some((value) => value !== null && Number.isFinite(value)),
  );

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
                    {formatYAxis
                      ? formatYAxis(tick)
                      : activeSeries[0]?.formatValue
                        ? activeSeries[0].formatValue(tick)
                        : String(tick)}
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
                    const barY = value >= 0 ? barTop : barBottom;
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
            {sourceDates[hoveredIndex] ? (
              <div className="trend-bar-chart__tooltip-date">
                基準日: {formatAsOfDateJa(sourceDates[hoveredIndex])}
              </div>
            ) : null}
            {activeSeries.map((item) => {
              const value = item.values[hoveredIndex];
              if (value === null || !Number.isFinite(value)) {
                return null;
              }
              const formatted = item.formatValue
                ? item.formatValue(value)
                : String(value);
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
