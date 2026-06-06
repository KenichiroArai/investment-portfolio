"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import { useState } from "react";

import { AllocationChart } from "@/features/analysis/AllocationChart";
import { AllocationTable } from "@/features/analysis/AllocationTable";
import { formatPercent, formatYen } from "@/lib/format-yen";

type AllocationTooltipState = {
  x: number;
  y: number;
  slice: AllocationSliceWithLines;
};

type AllocationPanelProps = {
  slices: AllocationSliceWithLines[];
  showPortfolioColumn?: boolean;
};

export function AllocationPanel({
  slices,
  showPortfolioColumn = false,
}: AllocationPanelProps) {
  const [highlightedValueCode, setHighlightedValueCode] = useState<string | null>(
    null,
  );
  const [expandedValueCode, setExpandedValueCode] = useState<string | null>(
    null,
  );
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
    setExpandedValueCode((current) => {
      let next: string | null = null;

      if (current !== valueCode) {
        next = valueCode;
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
            <span>構成比: {formatPercent(tooltip.slice.weight)}</span>
            <span>明細行数: {tooltip.slice.lines.length}</span>
          </div>
        ) : null}
      </div>
      <AllocationTable
        slices={slices}
        highlightedValueCode={highlightedValueCode}
        expandedValueCode={expandedValueCode}
        showPortfolioColumn={showPortfolioColumn}
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
