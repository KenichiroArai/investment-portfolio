"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import { sortAllocationSlices } from "@repo/shared";
import { ChevronRight } from "lucide-react";
import { Fragment, useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { ClassificationValueLabel } from "@/components/classification-value-label";
import { AllocationLineBreakdown } from "@/features/analysis/AllocationLineBreakdown";
import { useTableSort } from "@/hooks/useTableSort";
import { formatAllocationPercent, formatAllocationPercentPoint, formatPercent, formatYen } from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";
import { cn } from "@/lib/utils";

type AllocationSortColumn =
  | "displayOrder"
  | "valueName"
  | "marketValue"
  | "weight"
  | "unrealizedGain"
  | "unrealizedGainRate"
  | "targetRatio"
  | "gapRatio";

export type AllocationSliceTableRow = AllocationSliceWithLines & {
  targetRatio?: number | null;
  gapRatio?: number | null;
  gapMarketValueMinor?: number | null;
};

type AllocationTableProps = {
  slices: AllocationSliceTableRow[];
  highlightedValueCode: string | null;
  expandedValueCodes: string[];
  showPortfolioColumn?: boolean;
  portfolioCode?: string;
  schemeCode?: string;
  asOfDate?: string | null;
  valueIdByCode?: Map<string, string>;
  descriptionByValueCode?: Map<string, string | null>;
  drillDownValueIds?: Set<string>;
  allowLineExpand?: boolean;
  onSliceHover: (valueCode: string) => void;
  onSliceLeave: () => void;
  onToggleExpand: (valueCode: string) => void;
  onDrillDown?: (valueId: string) => void;
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

export function AllocationTable({
  slices,
  highlightedValueCode,
  expandedValueCodes,
  showPortfolioColumn = false,
  portfolioCode,
  schemeCode,
  asOfDate,
  valueIdByCode,
  descriptionByValueCode,
  drillDownValueIds,
  allowLineExpand = true,
  onSliceHover,
  onSliceLeave,
  onToggleExpand,
  onDrillDown,
}: AllocationTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<AllocationSortColumn>("displayOrder", "asc");

  const showGapColumns = slices.some((slice) => slice.targetRatio !== null && slice.targetRatio !== undefined);

  const sortedSlices = useMemo(() => {
    let result = sortAllocationSlices(slices, sortColumn, sortDirection);
    return result;
  }, [slices, sortColumn, sortDirection]);

  const columnCount = 6 + (showGapColumns ? 2 : 0);

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
          <SortableTableHeader
            label="損益"
            column="unrealizedGain"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          <SortableTableHeader
            label="損益率"
            column="unrealizedGainRate"
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
        {sortedSlices.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="data-table__empty">
              該当する分類タグがありません。
            </td>
          </tr>
        ) : (
          sortedSlices.map((slice) => {
            const isExpanded = expandedValueCodes.includes(slice.valueCode);
            const valueId = valueIdByCode?.get(slice.valueCode);
            const canDrillDown =
              valueId !== undefined &&
              drillDownValueIds?.has(valueId) === true &&
              onDrillDown !== undefined;
            const isHighlighted = highlightedValueCode === slice.valueCode;
            const rowClassName = cn(
              "data-table__row--parent",
              isHighlighted ? "allocation-table__row--highlight data-table__row--highlight" : undefined,
            );
            const holdingsHref =
              portfolioCode && schemeCode
                ? `${buildPortfolioPath(portfolioCode, "portfolio-allocation")}?scheme=${encodeURIComponent(schemeCode)}&value=${encodeURIComponent(slice.valueCode)}${asOfDate ? `&asOf=${encodeURIComponent(asOfDate)}` : ""}`
                : null;

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
                      aria-label={
                        canDrillDown
                          ? `${slice.valueName} の子分類へドリルダウン`
                          : `${slice.valueName} の内訳を${isExpanded ? "閉じる" : "開く"}`
                      }
                      onClick={() => {
                        if (canDrillDown && valueId) {
                          onDrillDown(valueId);
                          return;
                        }
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
                  <td>
                    <ClassificationValueLabel
                      name={slice.valueName}
                      description={descriptionByValueCode?.get(slice.valueCode)}
                      href={holdingsHref}
                      nameClassName="max-w-[12rem]"
                    />
                  </td>
                  <td className="data-table__cell-numeric">
                    {formatYen(slice.marketValueMinor)}
                  </td>
                  <td className="data-table__cell-numeric">
                    {formatAllocationPercent(slice.weight)}
                  </td>
                  <td
                    className={cn(
                      "data-table__cell-numeric",
                      getToneClass(slice.unrealizedGainMinor),
                    )}
                  >
                    {formatNullableYen(slice.unrealizedGainMinor)}
                  </td>
                  <td
                    className={cn(
                      "data-table__cell-numeric",
                      getToneClass(slice.unrealizedGainRate),
                    )}
                  >
                    {formatNullableRate(slice.unrealizedGainRate)}
                  </td>
                  {showGapColumns ? (
                    <>
                      <td className="data-table__cell-numeric">
                        {slice.targetRatio !== null && slice.targetRatio !== undefined
                          ? formatAllocationPercent(slice.targetRatio)
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "data-table__cell-numeric",
                          slice.gapRatio !== null &&
                            slice.gapRatio !== undefined &&
                            slice.gapRatio > 0
                            ? "text-positive"
                            : undefined,
                          slice.gapRatio !== null &&
                            slice.gapRatio !== undefined &&
                            slice.gapRatio < 0
                            ? "text-negative"
                            : undefined,
                        )}
                      >
                        {slice.gapRatio !== null && slice.gapRatio !== undefined
                          ? formatAllocationPercentPoint(slice.gapRatio)
                          : "—"}
                      </td>
                    </>
                  ) : null}
                </tr>
                {isExpanded && allowLineExpand ? (
                  <tr>
                    <td colSpan={columnCount} className="allocation-table__detail data-table__detail">
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
