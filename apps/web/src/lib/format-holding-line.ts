import {
  getPortfolioKindFeatures,
  getHoldingUnitPriceMetricCode,
  IDECO_KAKEIBO_METRIC_CODES,
  MONEX_HOLDING_METRIC_CODES,
  type HoldingLineColumnId,
  type HoldingLineMetricDto,
} from "@repo/shared";

import { formatPercent, formatYen } from "@/lib/format-yen";

const HOLDING_LINE_COLUMN_LABELS: Record<HoldingLineColumnId, string> = {
  portfolioName: "口座",
  instrumentName: "銘柄",
  accountType: "口座区分",
  custodyType: "預り区分",
  quantity: "口数",
  unitPrice10k: "時価単価(1万口)",
  unitPrice: "基準価額",
  avgCost: "平均取得単価",
  marketValue: "評価額",
  bookValue: "購入金額",
  weight: "分類内構成比",
  gain: "損益",
  gainRate: "損益率",
  dividendOption: "分配金",
};

const METRIC_LABELS: Record<string, string> = {
  [IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots]:
    HOLDING_LINE_COLUMN_LABELS.unitPrice10k,
  [MONEX_HOLDING_METRIC_CODES.unitPriceMinor]: HOLDING_LINE_COLUMN_LABELS.unitPrice,
  [MONEX_HOLDING_METRIC_CODES.avgCostMinor]: HOLDING_LINE_COLUMN_LABELS.avgCost,
  [MONEX_HOLDING_METRIC_CODES.accountType]: HOLDING_LINE_COLUMN_LABELS.accountType,
  [MONEX_HOLDING_METRIC_CODES.custodyType]: HOLDING_LINE_COLUMN_LABELS.custodyType,
  [MONEX_HOLDING_METRIC_CODES.dividendOption]:
    HOLDING_LINE_COLUMN_LABELS.dividendOption,
  [IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor]: HOLDING_LINE_COLUMN_LABELS.gain,
  [IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate]:
    HOLDING_LINE_COLUMN_LABELS.gainRate,
};

export function listHoldingLineColumns(portfolioKind: string): HoldingLineColumnId[] {
  let result = getPortfolioKindFeatures(portfolioKind).holdingLineColumns;
  return result;
}

export function formatHoldingColumnLabel(columnId: HoldingLineColumnId): string {
  let result = HOLDING_LINE_COLUMN_LABELS[columnId] ?? columnId;
  return result;
}

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

  if (
    metric.code === MONEX_HOLDING_METRIC_CODES.unitPriceMinor ||
    metric.code === MONEX_HOLDING_METRIC_CODES.avgCostMinor
  ) {
    if (metric.integerValue !== null) {
      result = formatYen(metric.integerValue);
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

export function resolveUnitPriceMetricCode(portfolioKind: string): string | null {
  let result = getHoldingUnitPriceMetricCode(portfolioKind);
  return result;
}
