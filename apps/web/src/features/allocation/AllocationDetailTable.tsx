"use client";

import {
  sortAllocationDetailRows,
  type AllocationDetailRow,
  type AllocationDetailSortColumn,
  type SortDirection,
} from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAsOfDateJa, formatPercent, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type AllocationDetailTableProps = {
  rows: AllocationDetailRow[];
  sortColumn?: AllocationDetailSortColumn;
  sortDirection?: SortDirection;
  onSort?: (column: AllocationDetailSortColumn) => void;
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

function getToneClass(value: number | null): string | undefined {
  let result: string | undefined = undefined;

  if (value === null || value === 0) {
    return result;
  }

  result = value > 0 ? "text-positive" : "text-negative";
  return result;
}

export function AllocationDetailTable({
  rows,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSort,
}: AllocationDetailTableProps) {
  const internalSort = useTableSort<AllocationDetailSortColumn>("asOfDate", "desc");
  const isControlled = onSort !== undefined;
  const sortColumn = isControlled
    ? (controlledSortColumn ?? "asOfDate")
    : internalSort.sortColumn;
  const sortDirection = isControlled
    ? (controlledSortDirection ?? "desc")
    : internalSort.sortDirection;
  const toggleSort = onSort ?? internalSort.toggleSort;

  const displayRows = useMemo(() => {
    let result = isControlled
      ? rows
      : sortAllocationDetailRows(rows, sortColumn, sortDirection);
    return result;
  }, [isControlled, rows, sortColumn, sortDirection]);

  let result = (
    <div className="overflow-x-auto px-2">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHeader
              label="基準日"
              column="asOfDate"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className="sticky left-0 z-10 min-w-[6.5rem] bg-card"
            />
            <SortableTableHeader
              label="分類"
              column="valueName"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className="sticky left-[6.5rem] z-10 min-w-[8rem] bg-card"
            />
            <SortableTableHeader
              label="評価額"
              column="marketValue"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHeader
              label="構成比"
              column="weight"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHeader
              label="損益"
              column="unrealizedGain"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHeader
              label="損益率"
              column="unrealizedGainRate"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                条件に一致する明細がありません。
              </TableCell>
            </TableRow>
          ) : (
            displayRows.map((row) => {
              let bodyRow = (
                <TableRow key={row.rowId}>
                  <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-card">
                    {formatAsOfDateJa(row.asOfDate)}
                  </TableCell>
                  <TableCell className="sticky left-[6.5rem] z-10 bg-card font-medium">
                    {row.valueName}
                  </TableCell>
                  <TableCell>{formatYen(row.marketValueMinor)}</TableCell>
                  <TableCell>{formatPercent(row.weight)}</TableCell>
                  <TableCell className={cn(getToneClass(row.unrealizedGainMinor))}>
                    {formatNullableYen(row.unrealizedGainMinor)}
                  </TableCell>
                  <TableCell className={cn(getToneClass(row.unrealizedGainRate))}>
                    {formatNullableRate(row.unrealizedGainRate)}
                  </TableCell>
                </TableRow>
              );
              return bodyRow;
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
  return result;
}
