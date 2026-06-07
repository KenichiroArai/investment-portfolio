import type { PortfolioSnapshotMetricInput } from "./portfolio-snapshot-metrics";

/** iDeCo 汎用 CSV 投入時に portfolio_snapshot_metrics へ書き込む code */
export const IDECO_PORTFOLIO_METRIC_CODES = {
  totalContributions: "ideco_total_contributions",
} as const;

/** CSV 汎用名 → metric code */
export const IDECO_PORTFOLIO_METRIC_CSV_LABELS: Record<string, string> = {
  拠出金累計: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
};

export function resolveIdecoPortfolioMetricCode(label: string): string | null {
  let result: string | null = null;

  const code = IDECO_PORTFOLIO_METRIC_CSV_LABELS[label];
  if (code) {
    result = code;
  }

  return result;
}

export function buildIdecoPortfolioMetricInput(params: {
  code: string;
  integerValue: number;
}): PortfolioSnapshotMetricInput {
  let result: PortfolioSnapshotMetricInput = {
    code: params.code,
    integerValue: params.integerValue,
  };
  return result;
}
