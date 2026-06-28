"use client";

import type { AllocationSliceWithLines, PortfolioAllocationRow, PortfolioAllocationSortColumn } from "@repo/shared";
import { sortPortfolioAllocationRows } from "@repo/shared";
import { useMemo, useState } from "react";

import { AllocationChart } from "@/features/analysis/AllocationChart";
import { PortfolioAllocationTable } from "@/features/portfolio-allocation/PortfolioAllocationTable";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAllocationPercent, formatYen } from "@/lib/format-yen";

type PortfolioAllocationTooltipState = {
  x: number;
  y: number;
  row: PortfolioAllocationRow;
};

type PortfolioAllocationPanelProps = {
  rows: PortfolioAllocationRow[];
};

function toChartSlices(rows: PortfolioAllocationRow[]): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];

  for (const row of rows) {
    result.push({
      valueCode: row.instrumentId,
      valueName: row.instrumentName,
      marketValueMinor: row.marketValueMinor,
      weight: row.currentRatio,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      lines: [],
    });
  }

  return result;
}

export function PortfolioAllocationPanel({ rows }: PortfolioAllocationPanelProps) {
  const [highlightedInstrumentId, setHighlightedInstrumentId] = useState<string | null>(
    null,
  );
  const [tooltip, setTooltip] = useState<PortfolioAllocationTooltipState | null>(null);
  const { sortColumn, sortDirection, toggleSort } = useTableSort<PortfolioAllocationSortColumn>(
    "sortOrder",
    "asc",
  );

  const sortedRows = useMemo(() => {
    let result = sortPortfolioAllocationRows(rows, sortColumn, sortDirection);
    return result;
  }, [rows, sortColumn, sortDirection]);

  const chartSlices = useMemo(() => {
    let result = toChartSlices(sortedRows);
    return result;
  }, [sortedRows]);

  function handleSliceHover(
    instrumentId: string,
    clientX: number,
    clientY: number,
  ): void {
    let result: void = undefined;
    const row = sortedRows.find((item) => item.instrumentId === instrumentId);

    if (!row) {
      return result;
    }

    setHighlightedInstrumentId(instrumentId);
    setTooltip({
      x: clientX,
      y: clientY,
      row,
    });
    return result;
  }

  function handleSliceLeave(): void {
    let result: void = undefined;
    setHighlightedInstrumentId(null);
    setTooltip(null);
    return result;
  }

  let result = (
    <div className="analysis-panel__content allocation-panel">
      <div className="allocation-panel__chart-area">
        <AllocationChart
          slices={chartSlices}
          highlightedValueCode={highlightedInstrumentId}
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
            <strong>{tooltip.row.instrumentName}</strong>
            <span>評価額: {formatYen(tooltip.row.marketValueMinor)}</span>
            <span>現状: {formatAllocationPercent(tooltip.row.currentRatio)}</span>
            {tooltip.row.targetRatio !== null ? (
              <span>目標: {formatAllocationPercent(tooltip.row.targetRatio)}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <PortfolioAllocationTable
        rows={sortedRows}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={toggleSort}
        highlightedInstrumentId={highlightedInstrumentId}
        onRowHover={(instrumentId) => {
          setHighlightedInstrumentId(instrumentId);
          setTooltip(null);
        }}
        onRowLeave={handleSliceLeave}
      />
    </div>
  );
  return result;
}
