"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import { sortAllocationSlices } from "@repo/shared";
import { ChevronRight } from "lucide-react";
import { Fragment, useMemo, type ReactNode } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { ClassificationValueLabel } from "@/components/classification-value-label";
import { AllocationLineBreakdown } from "@/features/analysis/AllocationLineBreakdown";
import { buildAllocationRowExpandKey } from "@/features/allocation/build-scheme-allocation-with-hierarchy";
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
  childSlicesByParentValueId?: Map<string, AllocationSliceTableRow[]>;
  onSliceHover: (valueCode: string) => void;
  onSliceLeave: () => void;
  onToggleExpand: (expandKey: string) => void;
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

function resolveChildSlices(
  slice: AllocationSliceTableRow,
  valueIdByCode: Map<string, string> | undefined,
  childSlicesByParentValueId: Map<string, AllocationSliceTableRow[]> | undefined,
): AllocationSliceTableRow[] {
  let result: AllocationSliceTableRow[] = [];

  if (slice.isParentResidual === true) {
    return result;
  }

  const valueId = valueIdByCode?.get(slice.valueCode);
  if (!valueId || !childSlicesByParentValueId) {
    return result;
  }

  result = childSlicesByParentValueId.get(valueId) ?? [];
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
  childSlicesByParentValueId,
  onSliceHover,
  onSliceLeave,
  onToggleExpand,
}: AllocationTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<AllocationSortColumn>("displayOrder", "asc");

  const showGapColumns = slices.some((slice) => slice.targetRatio !== null && slice.targetRatio !== undefined);

  const columnCount = 6 + (showGapColumns ? 2 : 0);

  const renderedRows = useMemo(() => {
    function renderSliceGroup(
      groupSlices: AllocationSliceTableRow[],
      depth: number,
      pathPrefix: string,
    ): ReactNode[] {
      let result: ReactNode[] = [];
      const sortedGroup = sortAllocationSlices(groupSlices, sortColumn, sortDirection);

      for (const slice of sortedGroup) {
        const expandKey = buildAllocationRowExpandKey(pathPrefix, slice);
        const isExpanded = expandedValueCodes.includes(expandKey);
        const childSlices = resolveChildSlices(
          slice,
          valueIdByCode,
          childSlicesByParentValueId,
        );
        const hasChildCategories = childSlices.length > 0;
        const isHighlighted = highlightedValueCode === slice.valueCode;
        const rowClassName = cn(
          "data-table__row--parent",
          isHighlighted ? "allocation-table__row--highlight data-table__row--highlight" : undefined,
        );
        const holdingsHref =
          portfolioCode && schemeCode
            ? `${buildPortfolioPath(portfolioCode, "portfolio-allocation")}?scheme=${encodeURIComponent(schemeCode)}&value=${encodeURIComponent(slice.valueCode)}${asOfDate ? `&asOf=${encodeURIComponent(asOfDate)}` : ""}`
            : null;
        const expandLabel = hasChildCategories
          ? `${slice.valueName} の子分類を${isExpanded ? "閉じる" : "開く"}`
          : `${slice.valueName} の内訳を${isExpanded ? "閉じる" : "開く"}`;

        result.push(
          <Fragment key={expandKey}>
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
                  aria-label={expandLabel}
                  onClick={() => {
                    onToggleExpand(expandKey);
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
                <div style={depth > 0 ? { paddingLeft: `${depth * 1.25}rem` } : undefined}>
                  <ClassificationValueLabel
                    name={slice.valueName}
                    description={descriptionByValueCode?.get(slice.valueCode)}
                    href={holdingsHref}
                    nameClassName="max-w-[12rem]"
                  />
                </div>
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
            {isExpanded && hasChildCategories
              ? renderSliceGroup(childSlices, depth + 1, expandKey)
              : null}
            {isExpanded && !hasChildCategories ? (
              <tr>
                <td colSpan={columnCount} className="allocation-table__detail data-table__detail">
                  <AllocationLineBreakdown
                    lines={slice.lines}
                    showPortfolioColumn={showPortfolioColumn}
                  />
                </td>
              </tr>
            ) : null}
          </Fragment>,
        );
      }

      return result;
    }

    let result = renderSliceGroup(slices, 0, "");
    return result;
  }, [
    asOfDate,
    childSlicesByParentValueId,
    columnCount,
    descriptionByValueCode,
    expandedValueCodes,
    highlightedValueCode,
    onSliceHover,
    onSliceLeave,
    onToggleExpand,
    portfolioCode,
    schemeCode,
    showGapColumns,
    showPortfolioColumn,
    slices,
    sortColumn,
    sortDirection,
    valueIdByCode,
  ]);

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
        {slices.length === 0 ? (
          <tr>
            <td colSpan={columnCount} className="data-table__empty">
              該当する分類タグがありません。
            </td>
          </tr>
        ) : (
          renderedRows
        )}
      </tbody>
    </table>
  );
  return result;
}
