"use client";

import type { AllocationShareChange } from "@repo/shared";
import type { ReactNode } from "react";

import {
  formatPercent,
  formatPercentPoint,
  formatYen,
} from "@/lib/format-yen";

type TrendPeriodSummaryProps = {
  startDateLabel: string;
  endDateLabel: string;
  startMarketValueMinor: number;
  endMarketValueMinor: number;
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

function formatSignedPercent(ratio: number): string {
  let result = formatPercent(Math.abs(ratio));
  if (ratio > 0) {
    result = `+${result}`;
  }
  if (ratio < 0) {
    result = `-${result}`;
  }
  return result;
}

export function TrendPeriodSummary({
  startDateLabel,
  endDateLabel,
  startMarketValueMinor,
  endMarketValueMinor,
  largestShareChange,
  sparseDataNote,
  singleBucketNote,
  baselineSummary,
}: TrendPeriodSummaryProps) {
  const deltaMinor = endMarketValueMinor - startMarketValueMinor;
  const deltaRatio =
    startMarketValueMinor !== 0 ? deltaMinor / startMarketValueMinor : null;

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
        <div className="trend-period-summary__card trend-period-summary__card--highlight">
          <span className="trend-period-summary__label">期間増減</span>
          <span
            className={`trend-period-summary__value${
              deltaMinor >= 0
                ? " trend-period-summary__value--positive"
                : " trend-period-summary__value--negative"
            }`}
          >
            {formatSignedYen(deltaMinor)}
            {deltaRatio !== null && Number.isFinite(deltaRatio) ? (
              <span className="trend-period-summary__sub">
                {" "}
                ({formatSignedPercent(deltaRatio)})
              </span>
            ) : null}
          </span>
        </div>
        {largestShareChange ? (
          <div className="trend-period-summary__card">
            <span className="trend-period-summary__label">最大シェア変動</span>
            <span className="trend-period-summary__value">
              {largestShareChange.label}{" "}
              <span
                className={
                  largestShareChange.deltaRatio >= 0
                    ? "trend-period-summary__value--positive"
                    : "trend-period-summary__value--negative"
                }
              >
                {formatPercentPoint(largestShareChange.deltaRatio)}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
  return result;
}
