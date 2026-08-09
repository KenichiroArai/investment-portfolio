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

type AggregatedAllocationLine = {
  row: HoldingLineDetailRow;
  unrealizedGainMinor: number | null;
};

function sumNullableAmount(
  current: number | null | undefined,
  incoming: number | null,
): number | null {
  let result: number | null = null;

  if (current === null || current === undefined) {
    result = incoming;
    return result;
  }

  if (incoming === null) {
    result = current;
    return result;
  }

  result = current + incoming;
  return result;
}

function buildAllocationLineDetailRows(
  lines: AllocationLineInSlice[],
): HoldingLineDetailRow[] {
  let result: HoldingLineDetailRow[] = [];
  const rowsByInstrument = new Map<string, AggregatedAllocationLine>();

  for (const lineInSlice of lines) {
    const groupKey = JSON.stringify([
      lineInSlice.portfolioCode ?? "",
      lineInSlice.line.instrumentName,
    ]);
    const existing = rowsByInstrument.get(groupKey);

    if (existing) {
      existing.row.quantity += lineInSlice.line.quantity;
      existing.row.marketValueMinor += lineInSlice.attributedMarketValueMinor;
      existing.row.bookValueMinor = sumNullableAmount(
        existing.row.bookValueMinor,
        lineInSlice.attributedBookValueMinor,
      );
      existing.row.weight += lineInSlice.weightInSlice;
      existing.unrealizedGainMinor = sumNullableAmount(
        existing.unrealizedGainMinor,
        lineInSlice.attributedUnrealizedGainMinor,
      );
      continue;
    }

    let aggregated: AggregatedAllocationLine = {
      row: {
        id: lineInSlice.line.id,
        instrumentName: lineInSlice.line.instrumentName,
        quantity: lineInSlice.line.quantity,
        marketValueMinor: lineInSlice.attributedMarketValueMinor,
        bookValueMinor: lineInSlice.attributedBookValueMinor,
        weight: lineInSlice.weightInSlice,
        metrics: lineInSlice.line.metrics,
        portfolioName: lineInSlice.portfolioName,
      },
      unrealizedGainMinor: lineInSlice.attributedUnrealizedGainMinor,
    };
    rowsByInstrument.set(groupKey, aggregated);
  }

  for (const aggregated of rowsByInstrument.values()) {
    aggregated.row.metrics = buildAttributedLineMetrics(
      aggregated.row.metrics,
      aggregated.unrealizedGainMinor,
      aggregated.row.bookValueMinor ?? null,
    );
    result.push(aggregated.row);
  }

  return result;
}

export function AllocationLineBreakdown({
  lines,
  portfolioKind = "ideco",
  showPortfolioColumn = false,
  className = "allocation-line-breakdown",
}: AllocationLineBreakdownProps) {
  const rows = buildAllocationLineDetailRows(lines);

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
