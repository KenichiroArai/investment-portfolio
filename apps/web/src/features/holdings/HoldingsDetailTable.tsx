"use client";

import {
  classificationSortColumnKey,
  findClassificationTagValue,
  IDECO_KAKEIBO_METRIC_CODES,
  sortHoldingsDetailLines,
  type AnalysisSchemeConfig,
  type HoldingLineDto,
} from "@repo/shared";
import { useMemo } from "react";

import { SortableTableHeader } from "@/components/SortableTableHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatBookValue,
  formatLineMetric,
  formatMetricLabel,
} from "@/lib/format-holding-line";
import { formatYen } from "@/lib/format-yen";
import { useTableSort } from "@/hooks/useTableSort";
import { cn } from "@/lib/utils";

type HoldingsDetailSortColumn =
  | "sortOrder"
  | "instrumentName"
  | "quantity"
  | "unitPrice"
  | "marketValue"
  | "bookValue"
  | "unrealizedGain"
  | "unrealizedGainRate"
  | `classification:${string}`;

type HoldingsDetailTableProps = {
  lines: HoldingLineDto[];
  classificationSchemes: AnalysisSchemeConfig[];
};

export function HoldingsDetailTable({
  lines,
  classificationSchemes,
}: HoldingsDetailTableProps) {
  const { sortColumn, sortDirection, toggleSort } =
    useTableSort<HoldingsDetailSortColumn>("sortOrder", "asc");

  const sortedLines = useMemo(() => {
    let result = sortHoldingsDetailLines(lines, sortColumn, sortDirection);
    return result;
  }, [lines, sortColumn, sortDirection]);

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
            <SortableTableHeader
              label={formatMetricLabel(
                IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
              )}
              column="unitPrice"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
            />
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
              ) as HoldingsDetailSortColumn;
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
          {sortedLines.map((line) => {
            let row = (
              <TableRow key={line.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  {line.instrumentName}
                </TableCell>
                <TableCell>{line.quantity}</TableCell>
                <TableCell>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
                  )}
                </TableCell>
                <TableCell>{formatYen(line.marketValueMinor)}</TableCell>
                <TableCell>{formatBookValue(line.bookValueMinor)}</TableCell>
                <TableCell>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                  )}
                </TableCell>
                <TableCell>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
                  )}
                </TableCell>
                {classificationSchemes.map((scheme) => {
                  const value =
                    findClassificationTagValue(line.tags, scheme.schemeCode) ??
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
            );
            return row;
          })}
        </TableBody>
      </Table>
    </div>
  );
  return result;
}
