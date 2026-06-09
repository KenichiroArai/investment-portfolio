import {
  IDECO_PORTFOLIO_METRIC_CODES,
  IDECO_PORTFOLIO_METRIC_CSV_LABELS,
} from "@repo/shared";

export type GenericMetricOption = {
  code: string;
  label: string;
};

export function listGenericMetricOptions(): GenericMetricOption[] {
  let result: GenericMetricOption[] = [];

  for (const [label, code] of Object.entries(IDECO_PORTFOLIO_METRIC_CSV_LABELS)) {
    result.push({ code, label });
  }

  if (result.length === 0) {
    result.push({
      code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
      label: "拠出金累計",
    });
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
