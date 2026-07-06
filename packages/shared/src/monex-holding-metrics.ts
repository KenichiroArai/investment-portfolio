import {
  IDECO_KAKEIBO_METRIC_CODES,
  type HoldingLineMetricInput,
} from "./holding-line-metrics";

/** Monex 明細 CSV 投入時に holding_line_metrics へ書き込む code */
export const MONEX_HOLDING_METRIC_CODES = {
  unitPriceMinor: "unit_price_minor",
  avgCostMinor: "avg_cost_minor",
  accountType: "account_type",
  custodyType: "custody_type",
  dividendOption: "dividend_option",
} as const;

export const MONEX_INSTRUMENT_ATTRIBUTE_CODES = {
  market: "market",
  ticker: "ticker",
} as const;

export function buildMonexHoldingMetrics(params: {
  unitPriceMinor: number;
  avgCostMinor: number;
  accountType: string;
  custodyType: string;
  dividendOption: string;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
}): HoldingLineMetricInput[] {
  let result: HoldingLineMetricInput[] = [
    {
      code: MONEX_HOLDING_METRIC_CODES.unitPriceMinor,
      integerValue: params.unitPriceMinor,
    },
    {
      code: MONEX_HOLDING_METRIC_CODES.avgCostMinor,
      integerValue: params.avgCostMinor,
    },
    {
      code: MONEX_HOLDING_METRIC_CODES.accountType,
      textValue: params.accountType,
    },
    {
      code: MONEX_HOLDING_METRIC_CODES.custodyType,
      textValue: params.custodyType,
    },
    {
      code: MONEX_HOLDING_METRIC_CODES.dividendOption,
      textValue: params.dividendOption,
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
