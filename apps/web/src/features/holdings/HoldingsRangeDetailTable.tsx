"use client";

import {
  findClassificationTagValue,
  groupRowsByAccount,
  IDECO_KAKEIBO_METRIC_CODES,
  shouldShowHoldingColumn,
  sortHoldingAccountGroups,
  sortHoldingDetailRows,
  type AnalysisSchemeConfig,
  type HoldingAccountGroup,
  type HoldingDetailRow,
  type HoldingDetailSortColumn,
  type SortDirection,
} from "@repo/shared";
import { Fragment, useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTableSort } from "@/hooks/useTableSort";
import { formatMetricLabel, resolveUnitPriceMetricCode } from "@/lib/format-holding-line";
import { formatAsOfDateJa, formatPercent, formatYen } from "@/lib/format-yen";
import { cn } from "@/lib/utils";

type HoldingsRangeDetailTableProps = {
  rows: HoldingDetailRow[];
  classificationSchemes: AnalysisSchemeConfig[];
  portfolioKind: string;
  sortColumn?: HoldingDetailSortColumn;
  sortDirection?: SortDirection;
  onSort?: (column: HoldingDetailSortColumn) => void;
  groupedByAccount?: boolean;
};

function formatUnitPrice(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = new Intl.NumberFormat("ja-JP").format(value);
  }

  return result;
}

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

  if (value === null || !Number.isFinite(value) || value === 0) {
    return result;
  }

  result = value > 0 ? "text-positive" : "text-negative";
  return result;
}

export function HoldingsRangeDetailTable({
  rows,
  classificationSchemes,
  portfolioKind,
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  onSort,
  groupedByAccount = true,
}: HoldingsRangeDetailTableProps) {
  const internalSort = useTableSort<HoldingDetailSortColumn>("asOfDate", "desc");
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
      : sortHoldingDetailRows(rows, sortColumn, sortDirection);
    return result;
  }, [isControlled, rows, sortColumn, sortDirection]);

  const groupedRows = useMemo(() => {
    let result: HoldingAccountGroup<HoldingDetailRow>[] = [];
    if (!groupedByAccount) {
      return result;
    }
    result = sortHoldingAccountGroups(
      groupRowsByAccount(displayRows),
      (groupRows) =>
        sortHoldingDetailRows(
          groupRows,
          sortColumn === "accountName" ? "asOfDate" : sortColumn,
          sortDirection,
        ),
      sortColumn,
      sortDirection,
    );
    return result;
  }, [groupedByAccount, displayRows, sortColumn, sortDirection]);

  const unitPriceMetricCode = resolveUnitPriceMetricCode(portfolioKind);
  const showUnitPrice =
    unitPriceMetricCode !== null &&
    (shouldShowHoldingColumn(portfolioKind, "unitPrice10k") ||
      shouldShowHoldingColumn(portfolioKind, "unitPrice"));
  const unitPriceLabel =
    unitPriceMetricCode !== null
      ? formatMetricLabel(unitPriceMetricCode)
      : "単価";
  const columnCount =
    2 +
    (groupedByAccount ? 0 : 1) +
    (showUnitPrice ? 1 : 0) +
    6 +
    classificationSchemes.length;
  const instrumentStickyClass = groupedByAccount
    ? "sticky left-[6.5rem] z-10 min-w-[10rem] bg-card"
    : "sticky left-[14.5rem] z-10 min-w-[10rem] bg-card";

  const renderDataRow = (row: HoldingDetailRow) => {
    const rowKey = `${row.asOfDate}:${row.lineId}`;
    let bodyRow = (
      <TableRow key={rowKey}>
        <TableCell className="sticky left-0 z-10 whitespace-nowrap bg-card">
          {formatAsOfDateJa(row.asOfDate)}
        </TableCell>
        {!groupedByAccount ? (
          <TableCell className="sticky left-[6.5rem] z-10 min-w-[8rem] bg-card">
            {row.accountName}
          </TableCell>
        ) : null}
        <TableCell className={cn(instrumentStickyClass, "font-medium")}>
          {row.instrumentName}
        </TableCell>
        <TableCell>{row.quantity.toLocaleString("ja-JP")}</TableCell>
        {showUnitPrice ? (
          <TableCell>{formatUnitPrice(row.unitPrice)}</TableCell>
        ) : null}
        <TableCell>{formatYen(row.marketValueMinor)}</TableCell>
        <TableCell>{formatNullableRate(row.portfolioWeight)}</TableCell>
        <TableCell>{formatNullableYen(row.bookValueMinor)}</TableCell>
        <TableCell className={getToneClass(row.unrealizedGainMinor)}>
          {formatNullableYen(row.unrealizedGainMinor)}
        </TableCell>
        <TableCell className={getToneClass(row.unrealizedGainRate)}>
          {formatNullableRate(row.unrealizedGainRate)}
        </TableCell>
        {classificationSchemes.map((scheme) => {
          const value =
            findClassificationTagValue(row.tags, scheme.schemeCode) ?? "—";
          let cell = (
            <TableCell
              key={scheme.schemeCode}
              className={cn("whitespace-nowrap text-sm")}
            >
              {value}
            </TableCell>
          );
          return cell;
        })}
      </TableRow>
    );
    return bodyRow;
  };

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
            {!groupedByAccount ? (
              <SortableTableHeader
                label="口座"
                column="accountName"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
                className="sticky left-[6.5rem] z-10 min-w-[8rem] bg-card"
              />
            ) : null}
            <SortableTableHeader
              label="銘柄"
              column="instrumentName"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className={instrumentStickyClass}
            />
            <SortableTableHeader
              label="口数"
              column="quantity"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
            {showUnitPrice ? (
              <SortableTableHeader
                label={unitPriceLabel}
                column="unitPrice"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={toggleSort}
              />
            ) : null}
            <SortableTableHeader
              label="資産残高"
              column="marketValue"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHeader
              label="構成比"
              column="portfolioWeight"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
            <SortableTableHeader
              label="購入金額"
              column="bookValue"
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
            {classificationSchemes.map((scheme) => {
              const columnKey =
                `classification:${scheme.schemeCode}` as HoldingDetailSortColumn;
              let header = (
                <SortableTableHeader
                  key={scheme.schemeCode}
                  label={scheme.schemeName}
                  column={columnKey}
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={toggleSort}
                  className="min-w-[4.5rem] text-xs"
                />
              );
              return header;
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                条件に一致する明細がありません。
              </TableCell>
            </TableRow>
          ) : groupedByAccount ? (
            groupedRows.map((group) => {
              let groupBlock = (
                <Fragment key={group.accountId}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={columnCount}
                      className="sticky left-0 z-10 bg-muted/40 py-2 font-semibold"
                    >
                      {group.accountName}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {group.rows.length} 件
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.rows.map((row) => renderDataRow(row))}
                </Fragment>
              );
              return groupBlock;
            })
          ) : (
            displayRows.map((row) => renderDataRow(row))
          )}
        </TableBody>
      </Table>
    </div>
  );
  return result;
}
