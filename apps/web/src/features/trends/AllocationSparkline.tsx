"use client";

import type { ReactNode } from "react";

type AllocationSparklineProps = {
  values: Array<number | null>;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
};

const DEFAULT_WIDTH = 88;
const DEFAULT_HEIGHT = 28;
const DEFAULT_COLOR = "#2563eb";
const PADDING = 2;

export function AllocationSparkline({
  values,
  color = DEFAULT_COLOR,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: AllocationSparklineProps) {
  let result: ReactNode = null;

  const finiteValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (finiteValues.length < 2) {
    result = (
      <span
        className={
          className
            ? `allocation-sparkline allocation-sparkline--empty ${className}`
            : "allocation-sparkline allocation-sparkline--empty"
        }
        aria-hidden="true"
      >
        —
      </span>
    );
    return result;
  }

  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  const range = maxValue - minValue || 1;
  const innerWidth = width - PADDING * 2;
  const innerHeight = height - PADDING * 2;

  const points = values
    .map((value, index) => {
      if (value === null || !Number.isFinite(value)) {
        return null;
      }
      const x = PADDING + (index / Math.max(values.length - 1, 1)) * innerWidth;
      const y =
        PADDING + innerHeight - ((value - minValue) / range) * innerHeight;
      return `${x},${y}`;
    })
    .filter((point): point is string => point !== null);

  if (points.length < 2) {
    result = (
      <span className="allocation-sparkline allocation-sparkline--empty" aria-hidden="true">
        —
      </span>
    );
    return result;
  }

  result = (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={
        className ? `allocation-sparkline ${className}` : "allocation-sparkline"
      }
      role="img"
      aria-label="構成比のミニ推移"
      width={width}
      height={height}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="allocation-sparkline__line"
      />
    </svg>
  );
  return result;
}
