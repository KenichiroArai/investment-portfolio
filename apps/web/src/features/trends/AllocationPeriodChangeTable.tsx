"use client";

import {
  sortAllocationPeriodChangeRows,
  type AllocationPeriodChangeRow,
  type AllocationPeriodChangeSortColumn,
} from "@repo/shared";
import { useMemo, type ReactNode } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { AllocationSparkline } from "@/features/trends/AllocationSparkline";
import { TrendChartHeader } from "@/features/trends/TrendChartHeader";
import { useTableSort } from "@/hooks/useTableSort";
import {
  formatAllocationPercent,
  formatAllocationPercentPoint,
  formatPercentRelativeChange,
  formatYen,
} from "@/lib/format-yen";

type AllocationPeriodChangeTableProps = {
  rows: AllocationPeriodChangeRow[];
  selectedKeys: string[];
  startDateLabel: string;
  endDateLabel: string;
  onToggleRow: (key: string) => void;
  className?: string;
};

function formatSignedYen(value: number): string {
  let result = formatYen(Math.abs(value));
  if (value > 0) {
    result = `+${result}`;
  }
  if (value < 0) {
    result = `-${result}`;
  }
  return result;
}

export function AllocationPeriodChangeTable({
  rows,
  selectedKeys,
  startDateLabel,
  endDateLabel,
  onToggleRow,
  className,
}: AllocationPeriodChangeTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<AllocationPeriodChangeSortColumn>("deltaRatio", "desc");

  const sortedRows = useMemo(() => {
    let result = sortAllocationPeriodChangeRows(
      rows,
      sortColumn,
      sortDirection,
      sortColumn === "deltaRatio" && sortDirection === "desc",
    );
    return result;
  }, [rows, sortColumn, sortDirection]);

  let result: ReactNode = null;

  if (rows.length === 0) {
    result = <p className="trend-chart__empty">期間内の構成変化を表示できるデータがありません。</p>;
    return result;
  }

  result = (
    <div
      className={
        className
          ? `allocation-period-change-table ${className}`
          : "allocation-period-change-table"
      }
    >
      <TrendChartHeader
        title="期間内の構成変化"
        titleLevel="h2"
        caption={`${startDateLabel} → ${endDateLabel}`}
      />
      <div className="allocation-period-change-table__scroll">
        <table className="data-table allocation-period-change-table__table">
          <thead>
            <tr>
              <SortableTableHeader
                label="分類"
                column="label"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="期首構成比"
                column="startRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="期末構成比"
                column="endRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="変化"
                column="deltaRatio"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="変化率"
                column="relativeRate"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="期首評価額"
                column="startMarketValueMinor"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="期末評価額"
                column="endMarketValueMinor"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHeader
                label="評価額変化"
                column="deltaMarketValueMinor"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
              <th scope="col">推移</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isSelected = selectedKeys.includes(row.key);
              let tableRow = (
                <tr
                  key={row.key}
                  className={
                    isSelected
                      ? "allocation-period-change-table__row allocation-period-change-table__row--selected"
                      : "allocation-period-change-table__row"
                  }
                  onClick={() => {
                    onToggleRow(row.key);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onToggleRow(row.key);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${row.label} の推移を${isSelected ? "非表示" : "表示"}`}
                >
                  <td>{row.label}</td>
                  <td>{formatAllocationPercent(row.startRatio)}</td>
                  <td>{formatAllocationPercent(row.endRatio)}</td>
                  <td
                    className={
                      row.deltaRatio >= 0
                        ? "allocation-period-change-table__delta allocation-period-change-table__delta--positive"
                        : "allocation-period-change-table__delta allocation-period-change-table__delta--negative"
                    }
                  >
                    {formatAllocationPercentPoint(row.deltaRatio)}
                  </td>
                  <td
                    className={
                      row.relativeRate === null
                        ? undefined
                        : row.relativeRate >= 0
                          ? "allocation-period-change-table__delta allocation-period-change-table__delta--positive"
                          : "allocation-period-change-table__delta allocation-period-change-table__delta--negative"
                    }
                  >
                    {row.relativeRate === null
                      ? "—"
                      : formatPercentRelativeChange(row.relativeRate)}
                  </td>
                  <td>{formatYen(row.startMarketValueMinor)}</td>
                  <td>{formatYen(row.endMarketValueMinor)}</td>
                  <td
                    className={
                      row.deltaMarketValueMinor >= 0
                        ? "allocation-period-change-table__delta allocation-period-change-table__delta--positive"
                        : "allocation-period-change-table__delta allocation-period-change-table__delta--negative"
                    }
                  >
                    {formatSignedYen(row.deltaMarketValueMinor)}
                  </td>
                  <td>
                    <AllocationSparkline values={row.ratioSeries} />
                  </td>
                </tr>
              );
              return tableRow;
            })}
          </tbody>
        </table>
      </div>
      <p className="allocation-period-change-table__footnote">
        選択期間の期首から期末までの変化です。変化は構成比のポイント差、変化率は期首比の相対変化です。推移列は表示単位ごとの構成比です。行をクリックすると下の折れ線グラフの表示を切り替えられます。
      </p>
    </div>
  );
  return result;
}
