import {
  computeSnapshotUnrealizedGainRate,
  IDECO_KAKEIBO_METRIC_CODES,
  type AllocationLineInSlice,
  type HoldingLineMetricDto,
} from "@repo/shared";

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

function buildAttributedLineMetrics(
  lineMetrics: HoldingLineMetricDto[],
  attributedGainMinor: number | null,
  attributedBookValueMinor: number | null,
): HoldingLineMetricDto[] {
  let result: HoldingLineMetricDto[] = [];

  for (const metric of lineMetrics) {
    if (
      metric.code === IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor ||
      metric.code === IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate
    ) {
      continue;
    }

    result.push(metric);
  }

  if (attributedGainMinor === null) {
    return result;
  }

  result.push({
    code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
    integerValue: attributedGainMinor,
    realValue: null,
    textValue: null,
  });

  if (attributedBookValueMinor === null) {
    return result;
  }

  const attributedGainRate = computeSnapshotUnrealizedGainRate(
    attributedGainMinor,
    attributedBookValueMinor,
  );
  if (attributedGainRate === null) {
    return result;
  }

  result.push({
    code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
    integerValue: null,
    realValue: attributedGainRate,
    textValue: null,
  });
  return result;
}

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
      marketValueMinor: lineInSlice.attributedMarketValueMinor,
      bookValueMinor: lineInSlice.attributedBookValueMinor,
      weight: lineInSlice.weightInSlice,
      metrics: buildAttributedLineMetrics(
        lineInSlice.line.metrics,
        lineInSlice.attributedUnrealizedGainMinor,
        lineInSlice.attributedBookValueMinor,
      ),
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
