"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import { useState, type ReactNode } from "react";

import { AllocationChart } from "@/features/analysis/AllocationChart";
import {
  formatAllocationPercent,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";

type TooltipState = {
  x: number;
  y: number;
  slice: AllocationSliceWithLines;
};

type GlobalAllocationDonutCardProps = {
  title: string;
  slices: AllocationSliceWithLines[];
  emptyMessage?: string;
};

function formatNullableYen(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatYen(value);
  }

  return result;
}

function formatNullableRate(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatPercent(value);
  }

  return result;
}

export function GlobalAllocationDonutCard({
  title,
  slices,
  emptyMessage = "表示できるデータがありません。",
}: GlobalAllocationDonutCardProps) {
  const [highlightedValueCode, setHighlightedValueCode] = useState<string | null>(
    null,
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

  function handleSliceLeave(): void {
    let result: void = undefined;
    setHighlightedValueCode(null);
    setTooltip(null);
    return result;
  }

  let result: ReactNode = (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {slices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="allocation-panel__chart-area relative">
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
              {tooltip.slice.unrealizedGainMinor !== null ? (
                <span>
                  損益: {formatNullableYen(tooltip.slice.unrealizedGainMinor)}
                </span>
              ) : null}
              {tooltip.slice.unrealizedGainRate !== null ? (
                <span>
                  損益率: {formatNullableRate(tooltip.slice.unrealizedGainRate)}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
  return result;
}
