import {
  IDECO_KAKEIBO_METRIC_CODES,
  type HoldingLineMetricDto,
} from "@repo/shared";

import { formatPercent, formatYen } from "@/lib/format-yen";

const METRIC_LABELS: Record<string, string> = {
  [IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots]:
    "時価単価(1万口)",
  [IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor]: "損益",
  [IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate]: "損益率",
};

export function formatMetricLabel(code: string): string {
  let result = METRIC_LABELS[code] ?? code;
  return result;
}

export function formatMetricValue(metric: HoldingLineMetricDto): string {
  let result = "—";

  if (metric.code === IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor) {
    if (metric.integerValue !== null) {
      result = formatYen(metric.integerValue);
    }
    return result;
  }

  if (metric.code === IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate) {
    if (metric.realValue !== null) {
      result = formatPercent(metric.realValue);
    }
    return result;
  }

  if (metric.integerValue !== null) {
    result = new Intl.NumberFormat("ja-JP").format(metric.integerValue);
    return result;
  }

  if (metric.realValue !== null) {
    result = String(metric.realValue);
    return result;
  }

  if (metric.textValue !== null) {
    result = metric.textValue;
  }

  return result;
}

export function formatLineMetric(
  metrics: HoldingLineMetricDto[],
  code: string,
): string {
  let result = "—";
  const metric = metrics.find((item) => item.code === code);

  if (metric) {
    result = formatMetricValue(metric);
  }

  return result;
}

export function formatBookValue(bookValueMinor: number | null): string {
  let result = "—";

  if (bookValueMinor !== null) {
    result = formatYen(bookValueMinor);
  }

  return result;
}
