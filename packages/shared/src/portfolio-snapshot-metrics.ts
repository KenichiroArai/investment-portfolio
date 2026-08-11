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

/** 汎用指標の削除（この基準日以降、次の更新まで無効）を表す textValue */
export const PORTFOLIO_METRIC_CLEARED_TEXT = "__CLEARED__";

export type DatedPortfolioMetrics = {
  asOfDate: string;
  metrics: Array<PortfolioSnapshotMetricDto | PortfolioSnapshotMetricInput>;
};

export function isClearedPortfolioMetric(
  metric: PortfolioSnapshotMetricDto | PortfolioSnapshotMetricInput,
): boolean {
  let result = metric.textValue === PORTFOLIO_METRIC_CLEARED_TEXT;
  return result;
}

export function buildClearedPortfolioMetricInput(
  code: string,
): PortfolioSnapshotMetricInput {
  let result: PortfolioSnapshotMetricInput = {
    code,
    integerValue: null,
    realValue: null,
    textValue: PORTFOLIO_METRIC_CLEARED_TEXT,
  };
  return result;
}

/**
 * 汎用指標は「登録した基準日から、同じ code が次に更新（または削除）されるまで」有効。
 * asOfDate 以前のスナップショット指標を時系列で畳み、その日時点の有効値を返す。
 */
export function resolveEffectivePortfolioMetrics(
  datedMetrics: DatedPortfolioMetrics[],
  asOfDate: string,
): PortfolioSnapshotMetricDto[] {
  let result: PortfolioSnapshotMetricDto[] = [];
  const effective = new Map<string, PortfolioSnapshotMetricDto>();

  const ordered = [...datedMetrics]
    .filter((item) => item.asOfDate <= asOfDate)
    .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate));

  for (const item of ordered) {
    for (const metric of item.metrics) {
      if (isClearedPortfolioMetric(metric)) {
        effective.delete(metric.code);
        continue;
      }

      effective.set(metric.code, {
        code: metric.code,
        integerValue: metric.integerValue ?? null,
        realValue: metric.realValue ?? null,
        textValue: metric.textValue ?? null,
      });
    }
  }

  result = [...effective.values()].sort((left, right) =>
    left.code.localeCompare(right.code),
  );
  return result;
}

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
