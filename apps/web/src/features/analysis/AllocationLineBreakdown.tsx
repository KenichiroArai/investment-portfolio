import type { AllocationLineInSlice } from "@repo/shared";

import {
  HoldingLineDetailTable,
  HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL,
  type HoldingLineDetailRow,
} from "@/features/holdings/HoldingLineDetailTable";

type AllocationLineBreakdownProps = {
  lines: AllocationLineInSlice[];
  portfolioKind?: string;
  showPortfolioColumn?: boolean;
  className?: string;
};

export function AllocationLineBreakdown({
  lines,
  portfolioKind = "ideco",
  showPortfolioColumn = false,
  className = "allocation-line-breakdown",
}: AllocationLineBreakdownProps) {
  const rows: HoldingLineDetailRow[] = [];

  for (const lineInSlice of lines) {
    let row: HoldingLineDetailRow = {
      id: lineInSlice.line.id,
      instrumentName: lineInSlice.line.instrumentName,
      quantity: lineInSlice.line.quantity,
      marketValueMinor: lineInSlice.line.marketValueMinor,
      bookValueMinor: lineInSlice.line.bookValueMinor,
      weight: lineInSlice.weightInSlice,
      metrics: lineInSlice.line.metrics,
      portfolioName: lineInSlice.portfolioName,
    };
    rows.push(row);
  }

  let result = (
    <HoldingLineDetailTable
      rows={rows}
      portfolioKind={portfolioKind}
      weightColumnLabel={HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL}
      showPortfolioColumn={showPortfolioColumn}
      className={className}
    />
  );
  return result;
}
