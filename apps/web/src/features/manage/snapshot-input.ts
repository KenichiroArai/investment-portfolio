import type {
  CurrentSnapshotDto,
  HoldingLineInput,
  PortfolioSnapshotMetricInput,
  ReplaceCurrentSnapshotInput,
} from "@repo/shared";

export function buildReplaceSnapshotInput(
  snapshot: CurrentSnapshotDto | null,
  params: {
    asOfDate: string;
    lines: HoldingLineInput[];
    metrics: PortfolioSnapshotMetricInput[];
  },
): ReplaceCurrentSnapshotInput {
  let result: ReplaceCurrentSnapshotInput = {
    asOfDate: params.asOfDate,
    lines: params.lines,
    metrics: params.metrics,
  };
  return result;
}

export function mergeHoldingLine(
  existingLines: HoldingLineInput[],
  newLine: HoldingLineInput,
): HoldingLineInput[] {
  let result = [...existingLines, newLine];
  return result;
}

export function updateHoldingLineAtIndex(
  lines: HoldingLineInput[],
  index: number,
  updated: HoldingLineInput,
): HoldingLineInput[] {
  let result = lines.map((line, lineIndex) => {
    if (lineIndex === index) {
      return updated;
    }
    return line;
  });
  return result;
}

export function removeHoldingLineAtIndex(
  lines: HoldingLineInput[],
  index: number,
): HoldingLineInput[] {
  let result = lines.filter((_, lineIndex) => lineIndex !== index);
  return result;
}

export function snapshotToHoldingInputs(
  snapshot: CurrentSnapshotDto,
): HoldingLineInput[] {
  let result: HoldingLineInput[] = [];

  for (const line of snapshot.lines) {
    result.push({
      instrumentId: line.instrumentId,
      accountId: line.accountId,
      accountName: line.accountName,
      quantity: line.quantity,
      marketValueMinor: line.marketValueMinor,
      bookValueMinor: line.bookValueMinor,
      sortOrder: line.sortOrder,
      metrics: line.metrics.map((metric) => ({
        code: metric.code,
        integerValue: metric.integerValue,
        realValue: metric.realValue,
        textValue: metric.textValue,
      })),
    });
  }

  return result;
}

export function snapshotToMetricInputs(
  snapshot: CurrentSnapshotDto,
): PortfolioSnapshotMetricInput[] {
  let result: PortfolioSnapshotMetricInput[] = [];

  for (const metric of snapshot.metrics) {
    result.push({
      code: metric.code,
      integerValue: metric.integerValue,
      realValue: metric.realValue,
      textValue: metric.textValue,
    });
  }

  return result;
}

export function upsertMetric(
  metrics: PortfolioSnapshotMetricInput[],
  metric: PortfolioSnapshotMetricInput,
): PortfolioSnapshotMetricInput[] {
  let result = metrics.filter((item) => item.code !== metric.code);
  result.push(metric);
  return result;
}

export function removeMetricByCode(
  metrics: PortfolioSnapshotMetricInput[],
  code: string,
): PortfolioSnapshotMetricInput[] {
  let result = metrics.filter((item) => item.code !== code);
  return result;
}
