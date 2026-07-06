"use client";

import {
  classificationSortColumnKey,
  findClassificationTagValue,
  IDECO_KAKEIBO_METRIC_CODES,
  shouldShowHoldingColumn,
  sortHoldingPeriodChangeRows,
  type AnalysisSchemeConfig,
  type HoldingPeriodChangeRow,
} from "@repo/shared";
import { Fragment, useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMetricLabel, resolveUnitPriceMetricCode } from "@/lib/format-holding-line";
import {
  formatPercent,
  formatSignedIntegerDelta,
  formatSignedYenDelta,
  formatYen,
} from "@/lib/format-yen";
import { useTableSort } from "@/hooks/useTableSort";
import { cn } from "@/lib/utils";

type HoldingsPeriodDetailSortColumn =
  | "sortOrder"
  | "instrumentName"
  | "quantity"
  | "unitPrice"
  | "marketValue"
  | "bookValue"
  | "unrealizedGain"
  | "unrealizedGainRate"
  | `classification:${string}`;

type HoldingsPeriodDetailTableProps = {
  rows: HoldingPeriodChangeRow[];
  classificationSchemes: AnalysisSchemeConfig[];
  portfolioKind: string;
  showDeltas: boolean;
};

function formatEndUnitPrice(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = new Intl.NumberFormat("ja-JP").format(value);
  }

  return result;
}

function formatEndUnrealizedGain(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatYen(value);
  }

  return result;
}

function formatEndUnrealizedGainRate(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatPercent(value);
  }

  return result;
}

function formatEndBookValue(value: number | null): string {
  let result = "—";

  if (value !== null && Number.isFinite(value)) {
    result = formatYen(value);
  }

  return result;
}

function formatDeltaYen(value: number | null): string {
  let result = "—";

  if (value === null || !Number.isFinite(value)) {
    return result;
  }

  if (value === 0) {
    result = formatSignedYenDelta(0);
    return result;
  }

  result = formatSignedYenDelta(value);
  return result;
}

function formatDeltaInteger(value: number | null): string {
  let result = "—";

  if (value === null || !Number.isFinite(value)) {
    return result;
  }

  result = formatSignedIntegerDelta(value);
  return result;
}

function formatDeltaRatePoint(value: number | null): string {
  let result = "—";

  if (value === null || !Number.isFinite(value)) {
    return result;
  }

  const points = value * 100;
  const abs = Math.abs(points);
  const decimals = abs >= 1 ? 1 : 2;
  const formatted = points.toFixed(decimals);
  if (points > 0) {
    result = `+${formatted} pt`;
    return result;
  }
  if (points < 0) {
    result = `${formatted} pt`;
    return result;
  }
  result = "0 pt";
  return result;
}

function getDeltaToneClass(value: number | null): string | undefined {
  let result: string | undefined = undefined;

  if (value === null || !Number.isFinite(value) || value === 0) {
    return result;
  }

  result = value > 0 ? "text-positive" : "text-negative";
  return result;
}

export function HoldingsPeriodDetailTable({
  rows,
  classificationSchemes,
  portfolioKind,
  showDeltas,
}: HoldingsPeriodDetailTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<HoldingsPeriodDetailSortColumn>("sortOrder", "asc");

  const sortedRows = useMemo(() => {
    let result = sortHoldingPeriodChangeRows(rows, sortColumn, sortDirection);
    return result;
  }, [rows, sortColumn, sortDirection]);
  const unitPriceMetricCode = resolveUnitPriceMetricCode(portfolioKind);
  const showUnitPrice =
    unitPriceMetricCode !== null &&
    (shouldShowHoldingColumn(portfolioKind, "unitPrice10k") ||
      shouldShowHoldingColumn(portfolioKind, "unitPrice"));
  const unitPriceLabel =
    unitPriceMetricCode !== null
      ? formatMetricLabel(unitPriceMetricCode)
      : "単価";

  let result = (
    <div className="overflow-x-auto px-2">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHeader
              label="銘柄"
              column="instrumentName"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className="sticky left-0 z-10 min-w-[10rem] bg-card"
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
              const columnKey = classificationSortColumnKey(
                scheme.schemeCode,
              ) as HoldingsPeriodDetailSortColumn;
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
          {sortedRows.map((row) => {
            const deltaRowVisible = showDeltas && row.hasBaseline;
            let bodyRows = (
              <Fragment key={row.lineId}>
                <TableRow>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    {row.instrumentName}
                  </TableCell>
                  <TableCell>{row.end.quantity.toLocaleString("ja-JP")}</TableCell>
                  {showUnitPrice ? (
                    <TableCell>{formatEndUnitPrice(row.end.unitPrice)}</TableCell>
                  ) : null}
                  <TableCell>{formatYen(row.end.marketValueMinor)}</TableCell>
                  <TableCell>{formatEndBookValue(row.end.bookValueMinor)}</TableCell>
                  <TableCell
                    className={getDeltaToneClass(row.end.unrealizedGainMinor)}
                  >
                    {formatEndUnrealizedGain(row.end.unrealizedGainMinor)}
                  </TableCell>
                  <TableCell
                    className={getDeltaToneClass(row.end.unrealizedGainRate)}
                  >
                    {formatEndUnrealizedGainRate(row.end.unrealizedGainRate)}
                  </TableCell>
                  {classificationSchemes.map((scheme) => {
                    const value =
                      findClassificationTagValue(row.tags, scheme.schemeCode) ??
                      "—";
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
                {deltaRowVisible ? (
                  <TableRow
                    className="border-b bg-muted/20 hover:bg-muted/20"
                  >
                    <TableCell className="sticky left-0 z-10 bg-muted/20" />
                    <TableCell
                      className={cn(
                        "text-xs text-muted-foreground",
                        getDeltaToneClass(row.delta.quantity),
                      )}
                    >
                      {formatDeltaInteger(row.delta.quantity)}
                    </TableCell>
                    {showUnitPrice ? (
                      <TableCell
                        className={cn(
                          "text-xs text-muted-foreground",
                          getDeltaToneClass(row.delta.unitPrice),
                        )}
                      >
                        {formatDeltaInteger(row.delta.unitPrice)}
                      </TableCell>
                    ) : null}
                    <TableCell
                      className={cn(
                        "text-xs text-muted-foreground",
                        getDeltaToneClass(row.delta.marketValueMinor),
                      )}
                    >
                      {formatDeltaYen(row.delta.marketValueMinor)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-muted-foreground",
                        getDeltaToneClass(row.delta.bookValueMinor),
                      )}
                    >
                      {formatDeltaYen(row.delta.bookValueMinor)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-muted-foreground",
                        getDeltaToneClass(row.delta.unrealizedGainMinor),
                      )}
                    >
                      {formatDeltaYen(row.delta.unrealizedGainMinor)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-muted-foreground",
                        getDeltaToneClass(row.delta.unrealizedGainRate),
                      )}
                    >
                      {formatDeltaRatePoint(row.delta.unrealizedGainRate)}
                    </TableCell>
                    {classificationSchemes.map((scheme) => {
                      let cell = (
                        <TableCell
                          key={scheme.schemeCode}
                          className="bg-muted/20"
                        />
                      );
                      return cell;
                    })}
                  </TableRow>
                ) : null}
              </Fragment>
            );
            return bodyRows;
          })}
        </TableBody>
      </Table>
    </div>
  );
  return result;
}
