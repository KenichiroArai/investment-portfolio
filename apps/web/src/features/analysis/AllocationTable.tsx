"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import { sortAllocationSlices } from "@repo/shared";
import { ChevronRight } from "lucide-react";
import { Fragment, useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { AllocationLineBreakdown } from "@/features/analysis/AllocationLineBreakdown";
import { useTableSort } from "@/hooks/useTableSort";
import { formatPercent, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type AllocationSortColumn = "valueName" | "marketValue" | "weight";

type AllocationTableProps = {
  slices: AllocationSliceWithLines[];
  highlightedValueCode: string | null;
  expandedValueCodes: string[];
  showPortfolioColumn?: boolean;
  onSliceHover: (valueCode: string) => void;
  onSliceLeave: () => void;
  onToggleExpand: (valueCode: string) => void;
};

export function AllocationTable({
  slices,
  highlightedValueCode,
  expandedValueCodes,
  showPortfolioColumn = false,
  onSliceHover,
  onSliceLeave,
  onToggleExpand,
}: AllocationTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<AllocationSortColumn>("marketValue", "desc");

  const sortedSlices = useMemo(() => {
    let result = sortAllocationSlices(slices, sortColumn, sortDirection);
    return result;
  }, [slices, sortColumn, sortDirection]);

  let result = (
    <table className="data-table allocation-table">
      <thead>
        <tr>
          <th aria-label="展開" />
          <SortableTableHeader
            label="分類"
            column="valueName"
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
            label="構成比"
            column="weight"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
        </tr>
      </thead>
      <tbody>
        {sortedSlices.length === 0 ? (
          <tr>
            <td colSpan={4} className="data-table__empty">
              該当する分類タグがありません。
            </td>
          </tr>
        ) : (
          sortedSlices.map((slice) => {
            const isExpanded = expandedValueCodes.includes(slice.valueCode);
            const isHighlighted = highlightedValueCode === slice.valueCode;
            const rowClassName = cn(
              "data-table__row--parent",
              isHighlighted ? "allocation-table__row--highlight data-table__row--highlight" : undefined,
            );

            let rows = (
              <Fragment key={slice.valueCode}>
                <tr
                  className={rowClassName}
                  onMouseEnter={() => {
                    onSliceHover(slice.valueCode);
                  }}
                  onMouseLeave={onSliceLeave}
                >
                  <td>
                    <button
                      type="button"
                      className="allocation-table__expand data-table__expand"
                      aria-expanded={isExpanded}
                      aria-label={`${slice.valueName} の内訳を${isExpanded ? "閉じる" : "開く"}`}
                      onClick={() => {
                        onToggleExpand(slice.valueCode);
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          "data-table__expand-icon",
                          isExpanded ? "data-table__expand-icon--expanded" : undefined,
                        )}
                        aria-hidden
                      />
                    </button>
                  </td>
                  <td>{slice.valueName}</td>
                  <td className="data-table__cell-numeric">
                    {formatYen(slice.marketValueMinor)}
                  </td>
                  <td className="data-table__cell-numeric">
                    {formatPercent(slice.weight)}
                  </td>
                </tr>
                {isExpanded ? (
                  <tr>
                    <td colSpan={4} className="allocation-table__detail data-table__detail">
                      <AllocationLineBreakdown
                        lines={slice.lines}
                        showPortfolioColumn={showPortfolioColumn}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
            return rows;
          })
        )}
      </tbody>
    </table>
  );
  return result;
}
