"use client";

import {
  computePeriodRelativeRate,
  type AllocationShareChange,
  type TrendPeriodMetricDelta,
} from "@repo/shared";
import type { ReactNode } from "react";

import {
  formatPercent,
  formatPercentPoint,
  formatPercentRelativeChange,
  formatYen,
} from "@/lib/format-yen";

type TrendPeriodSummaryProps = {
  startDateLabel: string;
  endDateLabel: string;
  startMarketValueMinor: number;
  endMarketValueMinor: number;
  metricDeltas: TrendPeriodMetricDelta[];
  largestShareChange: AllocationShareChange | null;
  sparseDataNote?: string | null;
  singleBucketNote?: string | null;
  baselineSummary?: string | null;
};

function formatSignedYen(value: number): string {
  let result = formatYen(Math.abs(value));
  if (value > 0) {
    result = `+${result}`;
  }
  if (value < 0) {
    result = `-${result}`;
  }
  return result;
}

function formatMetricValue(metric: TrendPeriodMetricDelta, value: number): string {
  let result = "";

  if (metric.unit === "yen") {
    result = formatYen(value);
    return result;
  }

  result = formatPercent(value);
  return result;
}

function formatAbsoluteDelta(metric: TrendPeriodMetricDelta): string {
  let result = "";

  if (metric.unit === "yen") {
    result = formatSignedYen(metric.absoluteDelta);
    return result;
  }

  result = formatPercentPoint(metric.absoluteDelta);
  return result;
}

function formatRelativeRateSuffix(relativeRate: number | null): ReactNode {
  let result: ReactNode = null;

  if (relativeRate === null || !Number.isFinite(relativeRate)) {
    return result;
  }

  result = (
    <span className="trend-period-summary__sub">
      {" "}
      ({formatPercentRelativeChange(relativeRate)})
    </span>
  );
  return result;
}

function resolveDeltaClassName(delta: number): string {
  let result = "trend-period-summary__value";

  if (delta >= 0) {
    result = `${result} trend-period-summary__value--positive`;
    return result;
  }

  result = `${result} trend-period-summary__value--negative`;
  return result;
}

export function TrendPeriodSummary({
  startDateLabel,
  endDateLabel,
  startMarketValueMinor,
  endMarketValueMinor,
  metricDeltas,
  largestShareChange,
  sparseDataNote,
  singleBucketNote,
  baselineSummary,
}: TrendPeriodSummaryProps) {
  const largestShareRelativeRate =
    largestShareChange !== null
      ? computePeriodRelativeRate(
          largestShareChange.startRatio,
          largestShareChange.endRatio,
        )
      : null;

  let result: ReactNode = (
    <div className="trend-period-summary">
      {sparseDataNote ? (
        <p className="trend-period-summary__note">{sparseDataNote}</p>
      ) : null}
      {singleBucketNote ? (
        <p className="trend-period-summary__note">{singleBucketNote}</p>
      ) : null}
      {baselineSummary ? (
        <p className="trend-period-summary__note">{baselineSummary}</p>
      ) : null}
      <div className="trend-period-summary__grid">
        <div className="trend-period-summary__card">
          <span className="trend-period-summary__label">期首（{startDateLabel}）</span>
          <span className="trend-period-summary__value">{formatYen(startMarketValueMinor)}</span>
        </div>
        <div className="trend-period-summary__card">
          <span className="trend-period-summary__label">期末（{endDateLabel}）</span>
          <span className="trend-period-summary__value">{formatYen(endMarketValueMinor)}</span>
        </div>
        {metricDeltas.map((metric) => {
          let metricCard = (
            <div
              key={metric.key}
              className={
                metric.key === "market-value"
                  ? "trend-period-summary__card trend-period-summary__card--highlight"
                  : "trend-period-summary__card"
              }
            >
              <span className="trend-period-summary__label">{metric.label}</span>
              <span className="trend-period-summary__range">
                {formatMetricValue(metric, metric.start)} → {formatMetricValue(metric, metric.end)}
              </span>
              <span className={resolveDeltaClassName(metric.absoluteDelta)}>
                {formatAbsoluteDelta(metric)}
                {formatRelativeRateSuffix(metric.relativeRate)}
              </span>
            </div>
          );
          return metricCard;
        })}
        {largestShareChange ? (
          <div className="trend-period-summary__card">
            <span className="trend-period-summary__label">最大シェア変動</span>
            <span className="trend-period-summary__value">
              {largestShareChange.label}{" "}
              <span className={resolveDeltaClassName(largestShareChange.deltaRatio)}>
                {formatPercentPoint(largestShareChange.deltaRatio)}
                {formatRelativeRateSuffix(largestShareRelativeRate)}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
  return result;
}
