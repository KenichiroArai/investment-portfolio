import {
  IDECO_KAKEIBO_METRIC_CODES,
  type HoldingLineMetricInput,
} from "./holding-line-metrics";

/** 楽天証券明細の投入時に holding_line_metrics へ書き込む code */
export const RAKUTEN_HOLDING_METRIC_CODES = {
  unitPriceMinor: "unit_price_minor",
  avgCostMinor: "avg_cost_minor",
  accountType: "account_type",
} as const;

export const RAKUTEN_INSTRUMENT_ATTRIBUTE_CODES = {
  ticker: "ticker",
} as const;

/** 投信の平均取得単価は1万口あたり（円）のため、保有口数との積は /10000 する */
export function computeRakutenMutualFundBookValueMinor(
  avgCostMinor: number,
  quantityLots: number,
): number {
  let result = 0;

  if (!Number.isFinite(avgCostMinor) || !Number.isFinite(quantityLots)) {
    return result;
  }

  result = Number(
    (BigInt(avgCostMinor) * BigInt(quantityLots) + BigInt(5000)) / BigInt(10000),
  );
  return result;
}

/** 株式の簿価 = 平均取得単価 × 株数 */
export function computeRakutenEquityBookValueMinor(
  avgCostMinor: number,
  quantityShares: number,
): number {
  let result = 0;

  if (!Number.isFinite(avgCostMinor) || !Number.isFinite(quantityShares)) {
    return result;
  }

  result = Math.round(avgCostMinor * quantityShares);
  return result;
}

export function buildRakutenHoldingMetrics(params: {
  unitPriceMinor: number;
  avgCostMinor: number;
  accountType: string;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
}): HoldingLineMetricInput[] {
  let result: HoldingLineMetricInput[] = [
    {
      code: RAKUTEN_HOLDING_METRIC_CODES.unitPriceMinor,
      integerValue: params.unitPriceMinor,
    },
    {
      code: RAKUTEN_HOLDING_METRIC_CODES.avgCostMinor,
      integerValue: params.avgCostMinor,
    },
    {
      code: RAKUTEN_HOLDING_METRIC_CODES.accountType,
      textValue: params.accountType,
    },
    {
      code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      integerValue: params.unrealizedGainMinor,
    },
    {
      code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      realValue: params.unrealizedGainRate,
    },
  ];
  return result;
}
