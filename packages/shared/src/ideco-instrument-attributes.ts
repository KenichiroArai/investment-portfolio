import type { HoldingLineMetricInput } from "./holding-line-metrics";

export type InstrumentAttributeInput = {
  code: string;
  integerValue?: number | null;
  realValue?: number | null;
  textValue?: string | null;
};

/** iDeCo 銘柄マスタ投入時に instrument_attributes へ書き込む code */
export const IDECO_INSTRUMENT_ATTRIBUTE_CODES = {
  shortName: "short_name",
  provider: "provider",
  trustFeeText: "trust_fee_text",
  trustReserveText: "trust_reserve_text",
} as const;

export function buildIdecoInstrumentAttributes(params: {
  shortName: string;
  provider: string;
  trustFeeText: string;
  trustReserveText: string;
}): InstrumentAttributeInput[] {
  let result: InstrumentAttributeInput[] = [
    {
      code: IDECO_INSTRUMENT_ATTRIBUTE_CODES.shortName,
      textValue: params.shortName,
    },
    {
      code: IDECO_INSTRUMENT_ATTRIBUTE_CODES.provider,
      textValue: params.provider,
    },
    {
      code: IDECO_INSTRUMENT_ATTRIBUTE_CODES.trustFeeText,
      textValue: params.trustFeeText,
    },
    {
      code: IDECO_INSTRUMENT_ATTRIBUTE_CODES.trustReserveText,
      textValue: params.trustReserveText,
    },
  ];
  return result;
}

export type { HoldingLineMetricInput };
