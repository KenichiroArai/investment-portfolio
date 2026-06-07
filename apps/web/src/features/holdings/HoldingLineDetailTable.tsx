"use client";

import {
  IDECO_KAKEIBO_METRIC_CODES,
  sortHoldingLineDetailRows,
  type HoldingLineMetricDto,
} from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import {
  formatLineMetric,
  formatMetricLabel,
} from "@/lib/format-holding-line";
import { formatPercent, formatYen } from "@/lib/format-yen";
import { useTableSort } from "@/hooks/useTableSort";

export const HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL = "分類内構成比";

export type HoldingLineDetailRow = {
  id: string;
  instrumentName: string;
  quantity: number;
  marketValueMinor: number;
  weight: number;
  metrics: HoldingLineMetricDto[];
  portfolioName?: string;
};

type HoldingLineDetailSortColumn =
  | "portfolioName"
  | "instrumentName"
  | "quantity"
  | "marketValue"
  | "weight"
  | "unrealizedGain"
  | "unrealizedGainRate";

type HoldingLineDetailTableProps = {
  rows: HoldingLineDetailRow[];
  weightColumnLabel: string;
  showPortfolioColumn?: boolean;
  className?: string;
};

export function HoldingLineDetailTable({
  rows,
  weightColumnLabel,
  showPortfolioColumn = false,
  className = "holding-line-detail-table",
}: HoldingLineDetailTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<HoldingLineDetailSortColumn>("marketValue", "desc");

  const sortedRows = useMemo(() => {
    let result = sortHoldingLineDetailRows(rows, sortColumn, sortDirection);
    return result;
  }, [rows, sortColumn, sortDirection]);

  let result = (
    <table className={className}>
      <thead>
        <tr>
          {showPortfolioColumn ? (
            <SortableTableHeader
              label="口座"
              column="portfolioName"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
          ) : null}
          <SortableTableHeader
            label="銘柄"
            column="instrumentName"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
          />
          <SortableTableHeader
            label="口数"
            column="quantity"
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
          />
          <SortableTableHeader
            label={weightColumnLabel}
            column="weight"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
          />
          <SortableTableHeader
            label={formatMetricLabel(
              IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            )}
            column="unrealizedGain"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
          />
          <SortableTableHeader
            label={formatMetricLabel(
              IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            )}
            column="unrealizedGainRate"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
          />
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => {
          let tableRow = (
            <tr key={row.id}>
              {showPortfolioColumn ? (
                <td>{row.portfolioName ?? "—"}</td>
              ) : null}
              <td>{row.instrumentName}</td>
              <td>{row.quantity}</td>
              <td>{formatYen(row.marketValueMinor)}</td>
              <td>{formatPercent(row.weight)}</td>
              <td>
                {formatLineMetric(
                  row.metrics,
                  IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                )}
              </td>
              <td>
                {formatLineMetric(
                  row.metrics,
                  IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
                )}
              </td>
            </tr>
          );
          return tableRow;
        })}
      </tbody>
    </table>
  );
  return result;
}
