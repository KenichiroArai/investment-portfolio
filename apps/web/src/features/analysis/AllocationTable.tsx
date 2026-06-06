import type { AllocationSliceWithLines } from "@repo/shared";
import { Fragment } from "react";

import { AllocationLineBreakdown } from "@/features/analysis/AllocationLineBreakdown";
import { formatPercent, formatYen } from "@/lib/format-yen";

type AllocationTableProps = {
  slices: AllocationSliceWithLines[];
  highlightedValueCode: string | null;
  expandedValueCode: string | null;
  showPortfolioColumn?: boolean;
  onSliceHover: (valueCode: string) => void;
  onSliceLeave: () => void;
  onToggleExpand: (valueCode: string) => void;
};

export function AllocationTable({
  slices,
  highlightedValueCode,
  expandedValueCode,
  showPortfolioColumn = false,
  onSliceHover,
  onSliceLeave,
  onToggleExpand,
}: AllocationTableProps) {
  let result = (
    <table className="allocation-table">
      <thead>
        <tr>
          <th aria-label="展開" />
          <th>分類</th>
          <th>評価額</th>
          <th>構成比</th>
        </tr>
      </thead>
      <tbody>
        {slices.length === 0 ? (
          <tr>
            <td colSpan={4}>該当する分類タグがありません。</td>
          </tr>
        ) : (
          slices.map((slice) => {
            const isExpanded = expandedValueCode === slice.valueCode;
            const isHighlighted = highlightedValueCode === slice.valueCode;
            const rowClassName = isHighlighted
              ? "allocation-table__row--highlight"
              : undefined;

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
                      className="allocation-table__expand"
                      aria-expanded={isExpanded}
                      aria-label={`${slice.valueName} の内訳を${isExpanded ? "閉じる" : "開く"}`}
                      onClick={() => {
                        onToggleExpand(slice.valueCode);
                      }}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </td>
                  <td>{slice.valueName}</td>
                  <td>{formatYen(slice.marketValueMinor)}</td>
                  <td>{formatPercent(slice.weight)}</td>
                </tr>
                {isExpanded ? (
                  <tr>
                    <td colSpan={4} className="allocation-table__detail">
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
