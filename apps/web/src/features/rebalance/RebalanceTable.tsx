"use client";

import type { RebalanceTradeRow } from "@repo/shared";
import { compareNullableNumbers, compareStrings, type SortDirection } from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { TableHead } from "@/components/ui/table";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAllocationPercent, formatAllocationPercentPoint, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

export type RebalanceDisplayRow = RebalanceTradeRow & {
  label: string;
  marketValueMinor: number;
  groupKey?: string;
  groupLabel?: string;
  isGroupHeader?: boolean;
  indentLevel?: 0 | 1;
  emptySliceNote?: string;
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
  grouped?: boolean;
};

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

function sortGroupedRebalanceRows(rows: RebalanceDisplayRow[]): RebalanceDisplayRow[] {
  let result: RebalanceDisplayRow[] = [];
  const groups = new Map<string, RebalanceDisplayRow[]>();

  for (const row of rows) {
    if (row.isGroupHeader) {
      groups.set(row.key, [row]);
      continue;
    }

    const groupKey = row.groupKey ?? row.key;
    const existing = groups.get(groupKey);
    if (existing) {
      existing.push(row);
      continue;
    }

    groups.set(groupKey, [row]);
  }

  const headers = rows.filter((row) => row.isGroupHeader);
  headers.sort((left, right) => {
    const leftTrade = Math.max(left.buyMinor, left.sellMinor);
    const rightTrade = Math.max(right.buyMinor, right.sellMinor);
    if (leftTrade !== rightTrade) {
      return rightTrade - leftTrade;
    }
    return compareStrings(left.label, right.label, "asc");
  });

  for (const header of headers) {
    const groupRows = groups.get(header.key) ?? [header];
    const children = groupRows
      .filter((row) => !row.isGroupHeader)
      .sort((left, right) => compareStrings(left.label, right.label, "asc"));

    result.push(header);
    result.push(...children);
  }

  return result;
}

function RebalanceTableRow({ row }: { row: RebalanceDisplayRow }) {
  let result = (
    <tr
      key={row.key}
      className={cn(row.isGroupHeader ? "bg-muted/40 font-medium" : undefined)}
    >
      <td className={cn("font-medium", row.indentLevel === 1 ? "pl-8" : undefined)}>
        {row.label}
        {row.emptySliceNote ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {row.emptySliceNote}
          </span>
        ) : null}
      </td>
      <td className="data-table__cell-numeric">{formatYen(row.marketValueMinor)}</td>
      <td className="data-table__cell-numeric">{formatAllocationPercent(row.currentRatio)}</td>
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
  return result;
}

export function RebalanceTable({ rows, grouped = false }: RebalanceTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<RebalanceSortColumn>("buyMinor", "desc");

  const sortedRows = useMemo(() => {
    let result = grouped
      ? sortGroupedRebalanceRows(rows)
      : sortRebalanceRows(rows, sortColumn, sortDirection);
    return result;
  }, [grouped, rows, sortColumn, sortDirection]);

  let result = (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {grouped ? (
              <>
                <TableHead>銘柄 / 分類</TableHead>
                <TableHead className="text-right">評価額</TableHead>
                <TableHead className="text-right">現状</TableHead>
                <TableHead className="text-right">目標</TableHead>
                <TableHead className="text-right">差分</TableHead>
                <TableHead className="text-right">買い</TableHead>
                <TableHead className="text-right">売り</TableHead>
              </>
            ) : (
              <>
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
              </>
            )}
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
              let bodyRow = <RebalanceTableRow key={row.key} row={row} />;
              return bodyRow;
            })
          )}
        </tbody>
      </table>
    </div>
  );
  return result;
}

export function GroupedRebalanceTable({ rows }: { rows: RebalanceDisplayRow[] }) {
  let result = <RebalanceTable rows={rows} grouped />;
  return result;
}
