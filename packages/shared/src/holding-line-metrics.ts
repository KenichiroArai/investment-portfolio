export type HoldingLineMetricDto = {
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

export type HoldingLineMetricInput = {
  code: string;
  integerValue?: number | null;
  realValue?: number | null;
  textValue?: string | null;
};

/** iDeCo 家計簿 CSV 投入時に holding_line_metrics へ書き込む code */
export const IDECO_KAKEIBO_METRIC_CODES = {
  unitPricePerTenThousandLots: "unit_price_per_10k_lots",
  unrealizedGainMinor: "unrealized_gain_minor",
  unrealizedGainRate: "unrealized_gain_rate",
} as const;

export function buildIdecoKakeiboMetrics(params: {
  unitPricePerTenThousandLots: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
}): HoldingLineMetricInput[] {
  const result: HoldingLineMetricInput[] = [
    {
      code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
      integerValue: params.unitPricePerTenThousandLots,
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
