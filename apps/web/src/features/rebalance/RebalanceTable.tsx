"use client";

import type { RebalanceTradeRow } from "@repo/shared";
import { compareNullableNumbers, compareStrings, type SortDirection } from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { useTableSort } from "@/hooks/useTableSort";
import { formatPercent, formatPercentPoint, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

export type RebalanceDisplayRow = RebalanceTradeRow & {
  label: string;
  marketValueMinor: number;
};

type RebalanceSortColumn =
  | "label"
  | "marketValue"
  | "currentRatio"
  | "targetRatio"
  | "gapRatio"
  | "buyMinor"
  | "sellMinor";

type RebalanceTableProps = {
  rows: RebalanceDisplayRow[];
};

function formatSignedPercentPoint(value: number): string {
  let result = formatPercentPoint(value);
  if (value > 0) {
    result = `+${result}`;
  }
  return result;
}

function sortRebalanceRows(
  rows: RebalanceDisplayRow[],
  column: RebalanceSortColumn,
  direction: SortDirection,
): RebalanceDisplayRow[] {
  let result = [...rows];

  result.sort((left, right) => {
    let compareResult = 0;

    if (column === "label") {
      compareResult = compareStrings(left.label, right.label, direction);
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
    } else if (column === "buyMinor") {
      compareResult = compareNullableNumbers(left.buyMinor, right.buyMinor, direction);
    } else if (column === "sellMinor") {
      compareResult = compareNullableNumbers(left.sellMinor, right.sellMinor, direction);
    }

    if (compareResult !== 0) {
      return compareResult;
    }

    return compareStrings(left.label, right.label, "asc");
  });

  return result;
}

export function RebalanceTable({ rows }: RebalanceTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<RebalanceSortColumn>("buyMinor", "desc");

  const sortedRows = useMemo(() => {
    let result = sortRebalanceRows(rows, sortColumn, sortDirection);
    return result;
  }, [rows, sortColumn, sortDirection]);

  let result = (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <SortableTableHeader
              label="銘柄 / 分類"
              column="label"
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
            <SortableTableHeader
              label="買い"
              column="buyMinor"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className="data-table__cell-numeric"
            />
            <SortableTableHeader
              label="売り"
              column="sellMinor"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className="data-table__cell-numeric"
            />
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="data-table__empty">
                リバランス対象がありません。
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => {
              let bodyRow = (
                <tr key={row.key}>
                  <td className="font-medium">{row.label}</td>
                  <td className="data-table__cell-numeric">
                    {formatYen(row.marketValueMinor)}
                  </td>
                  <td className="data-table__cell-numeric">
                    {formatPercent(row.currentRatio)}
                  </td>
                  <td className="data-table__cell-numeric">
                    {row.targetRatio !== null ? formatPercent(row.targetRatio) : "—"}
                  </td>
                  <td
                    className={cn(
                      "data-table__cell-numeric",
                      row.gapRatio !== null && row.gapRatio > 0 ? "text-positive" : undefined,
                      row.gapRatio !== null && row.gapRatio < 0 ? "text-negative" : undefined,
                    )}
                  >
                    {row.gapRatio !== null ? formatSignedPercentPoint(row.gapRatio) : "—"}
                  </td>
                  <td className="data-table__cell-numeric text-positive">
                    {row.targetRatio !== null && row.buyMinor > 0
                      ? formatYen(row.buyMinor)
                      : row.targetRatio !== null
                        ? formatYen(0)
                        : "—"}
                  </td>
                  <td className="data-table__cell-numeric text-negative">
                    {row.targetRatio !== null && row.sellMinor > 0
                      ? formatYen(row.sellMinor)
                      : row.targetRatio !== null
                        ? formatYen(0)
                        : "—"}
                  </td>
                </tr>
              );
              return bodyRow;
            })
          )}
        </tbody>
      </table>
    </div>
  );
  return result;
}
