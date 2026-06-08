"use client";

import { useMemo, useState, type ReactNode } from "react";

export type TrendLineSeries = {
  key: string;
  label: string;
  color: string;
  values: Array<number | null>;
  formatValue?: (value: number) => string;
};

type TrendLineChartProps = {
  labels: string[];
  series: TrendLineSeries[];
  height?: number;
  className?: string;
};

const CHART_WIDTH = 640;
const PADDING = { top: 16, right: 16, bottom: 32, left: 56 };

function buildPath(
  values: Array<number | null>,
  minValue: number,
  maxValue: number,
  plotWidth: number,
  plotHeight: number,
): string {
  let result = "";
  const range = maxValue - minValue || 1;
  const points: string[] = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === null || !Number.isFinite(value)) {
      continue;
    }
    const x =
      values.length <= 1
        ? plotWidth / 2
        : (index / (values.length - 1)) * plotWidth;
    const y = plotHeight - ((value - minValue) / range) * plotHeight;
    points.push(`${x},${y}`);
  }

  if (points.length === 0) {
    return result;
  }

  result = `M ${points.join(" L ")}`;
  return result;
}

export function TrendLineChart({
  labels,
  series,
  height = 200,
  className,
}: TrendLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const { minValue, maxValue } = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const item of series) {
      for (const value of item.values) {
        if (value === null || !Number.isFinite(value)) {
          continue;
        }
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return { minValue: 0, maxValue: 1 };
    }
    if (min === max) {
      return { minValue: min - 1, maxValue: max + 1 };
    }
    return { minValue: min, maxValue: max };
  }, [series]);

  let result: ReactNode = null;

  if (labels.length === 0 || series.length === 0) {
    result = <p className="trend-chart__empty">表示できるデータがありません。</p>;
    return result;
  }

  result = (
    <div className={className ? `trend-chart ${className}` : "trend-chart"}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="trend-chart__svg"
        role="img"
        aria-label="推移チャート"
      >
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          <line
            x1={0}
            y1={plotHeight}
            x2={plotWidth}
            y2={plotHeight}
            className="trend-chart__axis"
          />
          {series.map((item) => {
            const path = buildPath(
              item.values,
              minValue,
              maxValue,
              plotWidth,
              plotHeight,
            );
            if (path === "") {
              return null;
            }
            let line = (
              <path
                key={item.key}
                d={path}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                className="trend-chart__line"
              />
            );
            return line;
          })}
          {labels.map((label, index) => {
            const x =
              labels.length <= 1
                ? plotWidth / 2
                : (index / (labels.length - 1)) * plotWidth;
            let tick = (
              <text
                key={label}
                x={x}
                y={plotHeight + 20}
                textAnchor="middle"
                className="trend-chart__label"
              >
                {label}
              </text>
            );
            return tick;
          })}
          {labels.map((_, index) => {
            const x =
              labels.length <= 1
                ? plotWidth / 2
                : (index / (labels.length - 1)) * plotWidth;
            let hover = (
              <rect
                key={`hover-${index}`}
                x={x - 12}
                y={0}
                width={24}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => {
                  setHoveredIndex(index);
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                }}
              />
            );
            return hover;
          })}
          {hoveredIndex !== null ? (
            <line
              x1={
                labels.length <= 1
                  ? plotWidth / 2
                  : (hoveredIndex / (labels.length - 1)) * plotWidth
              }
              y1={0}
              x2={
                labels.length <= 1
                  ? plotWidth / 2
                  : (hoveredIndex / (labels.length - 1)) * plotWidth
              }
              y2={plotHeight}
              className="trend-chart__cursor"
            />
          ) : null}
        </g>
      </svg>
      <div className="trend-chart__legend">
        {series.map((item) => {
          let legend = (
            <span key={item.key} className="trend-chart__legend-item">
              <span
                className="trend-chart__legend-swatch"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          );
          return legend;
        })}
      </div>
      {hoveredIndex !== null ? (
        <div className="trend-chart__tooltip">
          <div>{labels[hoveredIndex]}</div>
          {series.map((item) => {
            const value = item.values[hoveredIndex];
            if (value === null || !Number.isFinite(value)) {
              return null;
            }
            const formatted = item.formatValue
              ? item.formatValue(value)
              : String(value);
            let row = (
              <div key={item.key}>
                {item.label}: {formatted}
              </div>
            );
            return row;
          })}
        </div>
      ) : null}
    </div>
  );
  return result;
}
