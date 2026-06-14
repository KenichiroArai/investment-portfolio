"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import { useState } from "react";

import { AllocationChart } from "@/features/analysis/AllocationChart";
import {
  AllocationTable,
  type AllocationSliceTableRow,
} from "@/features/analysis/AllocationTable";
import { formatAllocationPercent, formatAllocationPercentPoint, formatYen } from "@/lib/format-yen";

type AllocationTooltipState = {
  x: number;
  y: number;
  slice: AllocationSliceTableRow;
};

type AllocationPanelProps = {
  slices: AllocationSliceTableRow[];
  showPortfolioColumn?: boolean;
  portfolioCode?: string;
  schemeCode?: string;
  asOfDate?: string | null;
};

export function AllocationPanel({
  slices,
  showPortfolioColumn = false,
  portfolioCode,
  schemeCode,
  asOfDate,
}: AllocationPanelProps) {
  const [highlightedValueCode, setHighlightedValueCode] = useState<string | null>(
    null,
  );
  const [expandedValueCodes, setExpandedValueCodes] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<AllocationTooltipState | null>(null);

  function handleSliceHover(
    valueCode: string,
    clientX: number,
    clientY: number,
  ): void {
    let result: void = undefined;
    const slice = slices.find((item) => item.valueCode === valueCode);

    if (!slice) {
      return result;
    }

    setHighlightedValueCode(valueCode);
    setTooltip({
      x: clientX,
      y: clientY,
      slice,
    });
    return result;
  }

  function handleHighlight(valueCode: string): void {
    let result: void = undefined;
    setHighlightedValueCode(valueCode);
    setTooltip(null);
    return result;
  }

  function handleSliceLeave(): void {
    let result: void = undefined;
    setHighlightedValueCode(null);
    setTooltip(null);
    return result;
  }

  function handleToggleExpand(valueCode: string): void {
    let result: void = undefined;
    setExpandedValueCodes((current) => {
      let next: string[] = [];

      if (current.includes(valueCode)) {
        next = current.filter((code) => code !== valueCode);
      } else {
        next = [...current, valueCode];
      }

      return next;
    });
    return result;
  }

  let result = (
    <div className="analysis-panel__content allocation-panel">
      <div className="allocation-panel__chart-area">
        <AllocationChart
          slices={slices}
          highlightedValueCode={highlightedValueCode}
          onSliceHover={handleSliceHover}
          onSliceLeave={handleSliceLeave}
        />
        {tooltip ? (
          <div
            className="allocation-chart__tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
            role="tooltip"
          >
            <strong>{tooltip.slice.valueName}</strong>
            <span>評価額: {formatYen(tooltip.slice.marketValueMinor)}</span>
            <span>構成比: {formatAllocationPercent(tooltip.slice.weight)}</span>
            {tooltip.slice.targetRatio !== null &&
            tooltip.slice.targetRatio !== undefined ? (
              <span>目標: {formatAllocationPercent(tooltip.slice.targetRatio)}</span>
            ) : null}
            {tooltip.slice.gapRatio !== null && tooltip.slice.gapRatio !== undefined ? (
              <span>差分: {formatAllocationPercentPoint(tooltip.slice.gapRatio)}</span>
            ) : null}
            <span>明細行数: {tooltip.slice.lines.length}</span>
          </div>
        ) : null}
      </div>
      <AllocationTable
        slices={slices}
        highlightedValueCode={highlightedValueCode}
        expandedValueCodes={expandedValueCodes}
        showPortfolioColumn={showPortfolioColumn}
        portfolioCode={portfolioCode}
        schemeCode={schemeCode}
        asOfDate={asOfDate}
        onSliceHover={(valueCode) => {
          handleHighlight(valueCode);
        }}
        onSliceLeave={handleSliceLeave}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
  return result;
}
