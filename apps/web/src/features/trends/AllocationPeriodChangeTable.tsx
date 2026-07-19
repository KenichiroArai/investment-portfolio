"use client";

import {
  sortAllocationPeriodChangeRows,
  type AllocationPeriodChangeRow,
  type AllocationPeriodChangeSortColumn,
  type SortDirection,
} from "@repo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import { AllocationSparkline } from "@/features/trends/AllocationSparkline";
import {
  TrendChartExpandButton,
  TrendChartExpandDialog,
} from "@/features/trends/TrendChartExpandShell";
import { TrendChartHeader } from "@/features/trends/TrendChartHeader";
import type { TrendChartLayoutMode } from "@/features/trends/trend-chart-layout";
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
  title?: string;
  entityColumnLabel?: string;
  defaultSortColumn?: AllocationPeriodChangeSortColumn;
  defaultSortDirection?: SortDirection;
  layoutMode?: TrendChartLayoutMode;
};

const EXPANDED_TABLE_NOTE =
  "拡大表示ではすべての列を幅いっぱいに表示しています。銘柄列は固定され、推移は大きめのミニチャートです。行をクリックすると下の折れ線グラフの表示を切り替えられます。";
const EXPANDED_SPARKLINE_WIDTH = 160;
const EXPANDED_SPARKLINE_HEIGHT = 40;

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
  title = "期間内の構成変化",
  entityColumnLabel = "分類",
  defaultSortColumn = "deltaRatio",
  defaultSortDirection = "desc",
  layoutMode = "inline",
}: AllocationPeriodChangeTableProps) {
  const [expanded, setExpanded] = useState(false);
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<AllocationPeriodChangeSortColumn>(
      defaultSortColumn,
      defaultSortDirection,
    );

  const sortedRows = useMemo(() => {
    let result = sortAllocationPeriodChangeRows(
      rows,
      sortColumn,
      sortDirection,
      sortColumn === "deltaRatio" && sortDirection === "desc",
    );
    return result;
  }, [rows, sortColumn, sortDirection]);

  const showExpand = layoutMode === "inline";
  const isExpanded = layoutMode === "expanded";
  const sparklineWidth = isExpanded ? EXPANDED_SPARKLINE_WIDTH : undefined;
  const sparklineHeight = isExpanded ? EXPANDED_SPARKLINE_HEIGHT : undefined;
  const tableClassName = isExpanded
    ? "data-table allocation-period-change-table__table allocation-period-change-table__table--expanded"
    : "data-table allocation-period-change-table__table";
  const rootClassName = [
    "allocation-period-change-table",
    isExpanded ? "allocation-period-change-table--expanded" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  let result: ReactNode = null;

  if (rows.length === 0) {
    result = <p className="trend-chart__empty">期間内の構成変化を表示できるデータがありません。</p>;
    return result;
  }

  result = (
    <>
      <div className={rootClassName}>
        {isExpanded ? null : (
          <TrendChartHeader
            title={title}
            titleLevel="h2"
            caption={`${startDateLabel} → ${endDateLabel}`}
            actions={
              showExpand ? (
                <TrendChartExpandButton
                  ariaLabel="構成変化テーブルを拡大表示"
                  onClick={() => {
                    setExpanded(true);
                  }}
                />
              ) : null
            }
          />
        )}
        <div className="allocation-period-change-table__scroll">
          <table className={tableClassName}>
            <thead>
              <tr>
                <SortableTableHeader
                  label={entityColumnLabel}
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
                      <AllocationSparkline
                        values={row.ratioSeries}
                        width={sparklineWidth}
                        height={sparklineHeight}
                      />
                    </td>
                  </tr>
                );
                return tableRow;
              })}
            </tbody>
          </table>
        </div>
        {isExpanded ? null : (
          <p className="allocation-period-change-table__footnote">
            選択期間の期首から期末までの変化です。変化は構成比のポイント差、変化率は期首比の相対変化です。推移列は表示単位ごとの構成比です。行をクリックすると下の折れ線グラフの表示を切り替えられます。
          </p>
        )}
      </div>
      {showExpand ? (
        <TrendChartExpandDialog
          open={expanded}
          onOpenChange={setExpanded}
          title={title}
          description={EXPANDED_TABLE_NOTE}
        >
          {() => (
            <AllocationPeriodChangeTable
              rows={rows}
              selectedKeys={selectedKeys}
              startDateLabel={startDateLabel}
              endDateLabel={endDateLabel}
              onToggleRow={onToggleRow}
              className={className}
              title={title}
              entityColumnLabel={entityColumnLabel}
              defaultSortColumn={sortColumn}
              defaultSortDirection={sortDirection}
              layoutMode="expanded"
            />
          )}
        </TrendChartExpandDialog>
      ) : null}
    </>
  );
  return result;
}
