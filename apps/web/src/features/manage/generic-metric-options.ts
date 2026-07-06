import {
  getPortfolioKindFeatures,
  IDECO_PORTFOLIO_METRIC_CODES,
  IDECO_PORTFOLIO_METRIC_CSV_LABELS,
} from "@repo/shared";

export type GenericMetricOption = {
  code: string;
  label: string;
};

export function listGenericMetricOptions(portfolioKind: string): GenericMetricOption[] {
  let result: GenericMetricOption[] = [];
  const features = getPortfolioKindFeatures(portfolioKind);

  for (const metricCode of features.portfolioMetrics) {
    let label = metricCode;
    for (const [csvLabel, code] of Object.entries(IDECO_PORTFOLIO_METRIC_CSV_LABELS)) {
      if (code === metricCode) {
        label = csvLabel;
        break;
      }
    }
    if (metricCode === IDECO_PORTFOLIO_METRIC_CODES.totalContributions) {
      label = "拠出金累計";
    }
    result.push({ code: metricCode, label });
  }

  return result;
}

export function resolveGenericMetricLabel(code: string): string {
  let result = code;

  for (const [label, metricCode] of Object.entries(
    IDECO_PORTFOLIO_METRIC_CSV_LABELS,
  )) {
    if (metricCode === code) {
      result = label;
      return result;
    }
  }

  return result;
}
