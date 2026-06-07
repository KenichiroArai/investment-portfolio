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
  formatBookValue,
  formatLineMetric,
  formatMetricLabel,
} from "@/lib/format-holding-line";
import { formatYen } from "@/lib/format-yen";
import { useTableSort } from "@/hooks/useTableSort";

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
    <div className="holdings-table-wrapper">
      <table className="holdings-table">
        <thead>
          <tr>
            <SortableTableHeader
              label="銘柄"
              column="instrumentName"
              activeColumn={sortColumn}
              direction={sortDirection}
              onSort={toggleSort}
              className="holdings-table__instrument-col"
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
                  className="holdings-table__classification-col"
                />
              );
              return header;
            })}
          </tr>
        </thead>
        <tbody>
          {sortedLines.map((line) => {
            let row = (
              <tr key={line.id}>
                <td className="holdings-table__instrument-col">
                  {line.instrumentName}
                </td>
                <td>{line.quantity}</td>
                <td>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
                  )}
                </td>
                <td>{formatYen(line.marketValueMinor)}</td>
                <td>{formatBookValue(line.bookValueMinor)}</td>
                <td>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                  )}
                </td>
                <td>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
                  )}
                </td>
                {classificationSchemes.map((scheme) => {
                  const value =
                    findClassificationTagValue(line.tags, scheme.schemeCode) ??
                    "—";
                  let cell = (
                    <td
                      key={scheme.schemeCode}
                      className="holdings-table__classification-col"
                    >
                      {value}
                    </td>
                  );
                  return cell;
                })}
              </tr>
            );
            return row;
          })}
        </tbody>
      </table>
    </div>
  );
  return result;
}
