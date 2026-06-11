"use client";

import {
  buildNiceAxisScale,
  type AllocationShareChange,
} from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { TrendChartHeader } from "@/features/trends/TrendChartHeader";
import { formatPercentPoint } from "@/lib/format-yen";

type AllocationShareChangeChartProps = {
  changes: AllocationShareChange[];
  maxItems?: number;
  height?: number;
  className?: string;
  title?: string;
  titleLevel?: "h2" | "h3";
  caption?: string;
};

const PADDING = { top: 16, right: 16, bottom: 24, left: 120 };
const ROW_HEIGHT = 28;
const MIN_CHART_HEIGHT = 160;
const POSITIVE_COLOR = "#16a34a";
const NEGATIVE_COLOR = "#dc2626";

export function AllocationShareChangeChart({
  changes,
  maxItems = 8,
  height,
  className,
  title = "シェア変化ランキング",
  titleLevel = "h2",
  caption,
}: AllocationShareChangeChartProps) {
  const visibleChanges = useMemo(() => {
    let result = changes.slice(0, maxItems);
    return result;
  }, [changes, maxItems]);

  const chartHeight =
    height ?? Math.max(MIN_CHART_HEIGHT, PADDING.top + PADDING.bottom + visibleChanges.length * ROW_HEIGHT);
  const plotHeight = chartHeight - PADDING.top - PADDING.bottom;
  const plotWidth = 480;
  const chartWidth = plotWidth + PADDING.left + PADDING.right;

  const { minValue, maxValue, ticks } = useMemo(() => {
    let rawMin = 0;
    let rawMax = 0;
    for (const item of visibleChanges) {
      rawMin = Math.min(rawMin, item.deltaRatio);
      rawMax = Math.max(rawMax, item.deltaRatio);
    }
    if (visibleChanges.length === 0) {
      rawMin = -0.01;
      rawMax = 0.01;
    }
    const scale = buildNiceAxisScale(rawMin, rawMax);
    let result = {
      minValue: scale.min,
      maxValue: scale.max,
      ticks: scale.ticks,
    };
    return result;
  }, [visibleChanges]);

  const valueToX = (value: number): number => {
    let result = plotWidth / 2;
    const range = maxValue - minValue || 1;
    result = ((value - minValue) / range) * plotWidth;
    return result;
  };

  const zeroX = valueToX(0);

  let result: ReactNode = null;

  if (visibleChanges.length === 0) {
    result = <p className="trend-chart__empty">シェア変化を表示できるデータがありません。</p>;
    return result;
  }

  result = (
    <div
      className={
        className
          ? `allocation-share-change-chart ${className}`
          : "allocation-share-change-chart"
      }
    >
      {title ? (
        <TrendChartHeader title={title} titleLevel={titleLevel} caption={caption} />
      ) : null}
      <div className="allocation-share-change-chart__scroll">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="allocation-share-change-chart__svg"
          role="img"
          aria-label="シェア変化ランキング"
          style={{ minWidth: `${chartWidth}px` }}
        >
          <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
            {ticks.map((tick) => {
              const x = valueToX(tick);
              let gridLine = (
                <g key={tick}>
                  <line
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={plotHeight}
                    className="allocation-share-change-chart__grid"
                  />
                  <text
                    x={x}
                    y={plotHeight + 16}
                    textAnchor="middle"
                    className="allocation-share-change-chart__x-label"
                  >
                    {formatPercentPoint(tick)}
                  </text>
                </g>
              );
              return gridLine;
            })}
            <line
              x1={zeroX}
              y1={0}
              x2={zeroX}
              y2={plotHeight}
              className="allocation-share-change-chart__axis"
            />
            {visibleChanges.map((item, index) => {
              const y = index * ROW_HEIGHT + ROW_HEIGHT / 2;
              const barHeight = ROW_HEIGHT * 0.55;
              const endX = valueToX(item.deltaRatio);
              const barX = item.deltaRatio >= 0 ? zeroX : endX;
              const barWidth = Math.max(2, Math.abs(endX - zeroX));
              const color = item.deltaRatio >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;

              let row = (
                <g key={item.key}>
                  <text
                    x={-8}
                    y={y + 4}
                    textAnchor="end"
                    className="allocation-share-change-chart__y-label"
                  >
                    {item.label}
                  </text>
                  <rect
                    x={barX}
                    y={y - barHeight / 2}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    rx={2}
                    className="allocation-share-change-chart__bar"
                  />
                  <text
                    x={item.deltaRatio >= 0 ? endX + 4 : endX - 4}
                    y={y + 4}
                    textAnchor={item.deltaRatio >= 0 ? "start" : "end"}
                    className="allocation-share-change-chart__value-label"
                  >
                    {formatPercentPoint(item.deltaRatio)}
                  </text>
                </g>
              );
              return row;
            })}
          </g>
        </svg>
      </div>
      <p className="allocation-share-change-chart__footnote">
        期首から期末までの構成比変化（%ポイント）。正の値はシェア拡大、負の値はシェア縮小です。
      </p>
    </div>
  );
  return result;
}
