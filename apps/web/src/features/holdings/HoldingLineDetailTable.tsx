"use client";

import {
  IDECO_KAKEIBO_METRIC_CODES,
  MONEX_HOLDING_METRIC_CODES,
  shouldShowHoldingColumn,
  sortHoldingLineDetailRows,
  type HoldingLineMetricDto,
} from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import {
  formatBookValue,
  formatHoldingColumnLabel,
  formatLineMetric,
  formatMetricLabel,
} from "@/lib/format-holding-line";
import { formatPercent, formatYen } from "@/lib/format-yen";
import { useTableSort } from "@/hooks/useTableSort";
import { cn } from "@/lib/utils";

export const HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL = "分類内構成比";

export type HoldingLineDetailRow = {
  id: string;
  instrumentName: string;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor?: number | null;
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
  portfolioKind: string;
  weightColumnLabel: string;
  showPortfolioColumn?: boolean;
  className?: string;
};

function getMetricToneClass(
  metrics: HoldingLineMetricDto[],
  code: string,
): string | undefined {
  let result: string | undefined = undefined;
  const metric = metrics.find((item) => item.code === code);

  if (!metric) {
    return result;
  }

  const value =
    metric.integerValue !== null
      ? metric.integerValue
      : metric.realValue !== null
        ? metric.realValue
        : null;

  if (value === null || value === 0) {
    return result;
  }

  result = value > 0 ? "text-positive" : "text-negative";
  return result;
}

export function HoldingLineDetailTable({
  rows,
  portfolioKind,
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

  const showAccountType = shouldShowHoldingColumn(portfolioKind, "accountType");
  const showCustodyType = shouldShowHoldingColumn(portfolioKind, "custodyType");
  const showUnitPrice10k = shouldShowHoldingColumn(portfolioKind, "unitPrice10k");
  const showUnitPrice = shouldShowHoldingColumn(portfolioKind, "unitPrice");
  const showAvgCost = shouldShowHoldingColumn(portfolioKind, "avgCost");
  const showBookValue = shouldShowHoldingColumn(portfolioKind, "bookValue");
  const showDividendOption = shouldShowHoldingColumn(portfolioKind, "dividendOption");

  let result = (
    <table className={cn("data-table", className)}>
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
            label={formatHoldingColumnLabel("instrumentName")}
            column="instrumentName"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
          />
          {showAccountType ? (
            <th>{formatHoldingColumnLabel("accountType")}</th>
          ) : null}
          {showCustodyType ? (
            <th>{formatHoldingColumnLabel("custodyType")}</th>
          ) : null}
          <SortableTableHeader
            label={formatHoldingColumnLabel("quantity")}
            column="quantity"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          {showUnitPrice10k ? (
            <th className="data-table__cell-numeric">
              {formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots)}
            </th>
          ) : null}
          {showUnitPrice ? (
            <th className="data-table__cell-numeric">
              {formatHoldingColumnLabel("unitPrice")}
            </th>
          ) : null}
          {showAvgCost ? (
            <th className="data-table__cell-numeric">
              {formatHoldingColumnLabel("avgCost")}
            </th>
          ) : null}
          <SortableTableHeader
            label={formatHoldingColumnLabel("marketValue")}
            column="marketValue"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          {showBookValue ? (
            <th className="data-table__cell-numeric">
              {formatHoldingColumnLabel("bookValue")}
            </th>
          ) : null}
          <SortableTableHeader
            label={weightColumnLabel}
            column="weight"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          <SortableTableHeader
            label={formatMetricLabel(
              IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            )}
            column="unrealizedGain"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          <SortableTableHeader
            label={formatMetricLabel(
              IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            )}
            column="unrealizedGainRate"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={toggleSort}
            className="data-table__cell-numeric"
          />
          {showDividendOption ? (
            <th>{formatHoldingColumnLabel("dividendOption")}</th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => {
          const gainToneClass = getMetricToneClass(
            row.metrics,
            IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
          );
          const gainRateToneClass = getMetricToneClass(
            row.metrics,
            IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
          );

          let tableRow = (
            <tr key={row.id}>
              {showPortfolioColumn ? (
                <td>{row.portfolioName ?? "—"}</td>
              ) : null}
              <td>{row.instrumentName}</td>
              {showAccountType ? (
                <td>
                  {formatLineMetric(row.metrics, MONEX_HOLDING_METRIC_CODES.accountType)}
                </td>
              ) : null}
              {showCustodyType ? (
                <td>
                  {formatLineMetric(row.metrics, MONEX_HOLDING_METRIC_CODES.custodyType)}
                </td>
              ) : null}
              <td className="data-table__cell-numeric">{row.quantity}</td>
              {showUnitPrice10k ? (
                <td className="data-table__cell-numeric">
                  {formatLineMetric(
                    row.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
                  )}
                </td>
              ) : null}
              {showUnitPrice ? (
                <td className="data-table__cell-numeric">
                  {formatLineMetric(
                    row.metrics,
                    MONEX_HOLDING_METRIC_CODES.unitPriceMinor,
                  )}
                </td>
              ) : null}
              {showAvgCost ? (
                <td className="data-table__cell-numeric">
                  {formatLineMetric(
                    row.metrics,
                    MONEX_HOLDING_METRIC_CODES.avgCostMinor,
                  )}
                </td>
              ) : null}
              <td className="data-table__cell-numeric">
                {formatYen(row.marketValueMinor)}
              </td>
              {showBookValue ? (
                <td className="data-table__cell-numeric">
                  {formatBookValue(row.bookValueMinor ?? null)}
                </td>
              ) : null}
              <td className="data-table__cell-numeric">
                {formatPercent(row.weight)}
              </td>
              <td className={cn("data-table__cell-numeric", gainToneClass)}>
                {formatLineMetric(
                  row.metrics,
                  IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                )}
              </td>
              <td className={cn("data-table__cell-numeric", gainRateToneClass)}>
                {formatLineMetric(
                  row.metrics,
                  IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
                )}
              </td>
              {showDividendOption ? (
                <td>
                  {formatLineMetric(
                    row.metrics,
                    MONEX_HOLDING_METRIC_CODES.dividendOption,
                  )}
                </td>
              ) : null}
            </tr>
          );
          return tableRow;
        })}
      </tbody>
    </table>
  );
  return result;
}
