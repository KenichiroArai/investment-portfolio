import { IDECO_PORTFOLIO_METRIC_CODES } from "./ideco-portfolio-metrics";
import { sumSnapshotBookValue } from "./snapshot-allocation";
import type { CurrentSnapshotDto } from "./types";

export type PortfolioSnapshotMetricDto = {
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

export type PortfolioSnapshotMetricInput = {
  code: string;
  integerValue?: number | null;
  realValue?: number | null;
  textValue?: string | null;
};

export function getSnapshotMetricIntegerValue(
  metrics: PortfolioSnapshotMetricDto[],
  code: string,
): number | null {
  let result: number | null = null;
  const metric = metrics.find((item) => item.code === code);

  if (metric?.integerValue !== null && metric?.integerValue !== undefined) {
    result = metric.integerValue;
  }

  return result;
}

export function resolveSnapshotTotalContributions(
  snapshot: CurrentSnapshotDto,
): number {
  let result = 0;

  const fromMetric = getSnapshotMetricIntegerValue(
    snapshot.metrics,
    IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
  );
  if (fromMetric !== null) {
    result = fromMetric;
    return result;
  }

  result = sumSnapshotBookValue(snapshot.lines);
  return result;
}

export function computeSnapshotPortfolioGainMinor(
  assetBalanceMinor: number,
  totalContributionsMinor: number,
): number {
  let result = 0;
  result = assetBalanceMinor - totalContributionsMinor;
  return result;
}

export function computeSnapshotGainRate(
  gainMinor: number,
  denominatorMinor: number,
): number | null {
  let result: number | null = null;

  if (denominatorMinor === 0) {
    return result;
  }

  result = gainMinor / denominatorMinor;
  return result;
}
