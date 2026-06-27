"use client";

import type {
  PortfolioAllocationRow,
  PortfolioAllocationSortColumn,
  SortDirection,
} from "@repo/shared";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { formatAllocationDivergenceRatio, formatAllocationPercent, formatAllocationPercentPoint, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type PortfolioAllocationTableProps = {
  rows: PortfolioAllocationRow[];
  sortColumn: PortfolioAllocationSortColumn;
  sortDirection: SortDirection;
  onSort: (column: PortfolioAllocationSortColumn) => void;
  highlightedInstrumentId: string | null;
  onRowHover: (instrumentId: string) => void;
  onRowLeave: () => void;
};

export function PortfolioAllocationTable({
  rows,
  sortColumn,
  sortDirection,
  onSort,
  highlightedInstrumentId,
  onRowHover,
  onRowLeave,
}: PortfolioAllocationTableProps) {
  const showGapColumns = rows.some((row) => row.targetRatio !== null);
  const columnCount = 4 + (showGapColumns ? 3 : 0);

  let result = (
    <table className="data-table allocation-table">
      <thead>
        <tr>
          <SortableTableHeader
            label="銘柄"
            column="instrumentName"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={onSort}
          />
          <SortableTableHeader
            label="評価額"
            column="marketValue"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={onSort}
            className="data-table__cell-numeric"
          />
          <SortableTableHeader
            label="現状"
            column="currentRatio"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={onSort}
            className="data-table__cell-numeric"
          />
          {showGapColumns ? (
            <>
              <SortableTableHeader
                label="目標"
                column="targetRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={onSort}
                className="data-table__cell-numeric"
              />
              <SortableTableHeader
                label="差分"
                column="gapRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={onSort}
                className="data-table__cell-numeric"
              />
              <SortableTableHeader
                label="乖離率"
                column="gapDivergenceRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={onSort}
                className="data-table__cell-numeric"
              />
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="data-table__empty">
              保有明細がありません。
            </td>
          </tr>
        ) : (
          rows.map((row) => {
            const isHighlighted = highlightedInstrumentId === row.instrumentId;
            let bodyRow = (
              <tr
                key={row.instrumentId}
                className={cn(
                  isHighlighted ? "allocation-table__row--highlight data-table__row--highlight" : undefined,
                )}
                onMouseEnter={() => {
                  onRowHover(row.instrumentId);
                }}
                onMouseLeave={onRowLeave}
              >
                <td className="font-medium">{row.instrumentName}</td>
                <td className="data-table__cell-numeric">
                  {formatYen(row.marketValueMinor)}
                </td>
                <td className="data-table__cell-numeric">
                  {formatAllocationPercent(row.currentRatio)}
                </td>
                {showGapColumns ? (
                  <>
                    <td className="data-table__cell-numeric">
                      {row.targetRatio !== null ? formatAllocationPercent(row.targetRatio) : "—"}
                    </td>
                    <td
                      className={cn(
                        "data-table__cell-numeric",
                        row.gapRatio !== null && row.gapRatio > 0 ? "text-positive" : undefined,
                        row.gapRatio !== null && row.gapRatio < 0 ? "text-negative" : undefined,
                      )}
                    >
                      {row.gapRatio !== null ? formatAllocationPercentPoint(row.gapRatio) : "—"}
                    </td>
                    <td className="data-table__cell-numeric">
                      {row.gapDivergenceRatio !== null
                        ? formatAllocationDivergenceRatio(row.gapDivergenceRatio)
                        : "—"}
                    </td>
                  </>
                ) : null}
              </tr>
            );
            return bodyRow;
          })
        )}
      </tbody>
    </table>
  );
  return result;
}
