"use client";

import type { PortfolioAllocationRow } from "@repo/shared";
import { compareNullableNumbers, compareStrings, type SortDirection } from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAllocationPercent, formatAllocationPercentPoint, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type PortfolioAllocationSortColumn =
  | "instrumentName"
  | "marketValue"
  | "currentRatio"
  | "targetRatio"
  | "gapRatio";

type PortfolioAllocationTableProps = {
  rows: PortfolioAllocationRow[];
  highlightedInstrumentId: string | null;
  onRowHover: (instrumentId: string) => void;
  onRowLeave: () => void;
};

function sortPortfolioAllocationRows(
  rows: PortfolioAllocationRow[],
  column: PortfolioAllocationSortColumn,
  direction: SortDirection,
): PortfolioAllocationRow[] {
  let result = [...rows];

  result.sort((left, right) => {
    let compareResult = 0;

    if (column === "instrumentName") {
      compareResult = compareStrings(left.instrumentName, right.instrumentName, direction);
    } else if (column === "marketValue") {
      compareResult = compareNullableNumbers(
        left.marketValueMinor,
        right.marketValueMinor,
        direction,
      );
    } else if (column === "currentRatio") {
      compareResult = compareNullableNumbers(left.currentRatio, right.currentRatio, direction);
    } else if (column === "targetRatio") {
      compareResult = compareNullableNumbers(left.targetRatio, right.targetRatio, direction);
    } else if (column === "gapRatio") {
      compareResult = compareNullableNumbers(left.gapRatio, right.gapRatio, direction);
    }

    if (compareResult !== 0) {
      return compareResult;
    }

    return compareStrings(left.instrumentName, right.instrumentName, "asc");
  });

  return result;
}

export function PortfolioAllocationTable({
  rows,
  highlightedInstrumentId,
  onRowHover,
  onRowLeave,
}: PortfolioAllocationTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<PortfolioAllocationSortColumn>("marketValue", "desc");

  const showGapColumns = rows.some((row) => row.targetRatio !== null);
  const columnCount = 4 + (showGapColumns ? 2 : 0);

  const sortedRows = useMemo(() => {
    let result = sortPortfolioAllocationRows(rows, sortColumn, sortDirection);
    return result;
  }, [rows, sortColumn, sortDirection]);

  let result = (
    <table className="data-table allocation-table">
      <thead>
        <tr>
          <SortableTableHeader
            label="銘柄"
            column="instrumentName"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
          />
          <SortableTableHeader
            label="評価額"
            column="marketValue"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          <SortableTableHeader
            label="現状"
            column="currentRatio"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          {showGapColumns ? (
            <>
              <SortableTableHeader
                label="目標"
                column="targetRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
                className="data-table__cell-numeric"
              />
              <SortableTableHeader
                label="差分"
                column="gapRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
                className="data-table__cell-numeric"
              />
            </>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {sortedRows.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="data-table__empty">
              保有明細がありません。
            </td>
          </tr>
        ) : (
          sortedRows.map((row) => {
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
