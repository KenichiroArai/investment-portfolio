import { IDECO_PORTFOLIO_METRIC_CODES } from "./ideco-portfolio-metrics";
import { MONEX_INSTRUMENT_ATTRIBUTE_CODES } from "./monex-holding-metrics";
import { RAKUTEN_INSTRUMENT_ATTRIBUTE_CODES } from "./rakuten-holding-metrics";

export type HoldingLineColumnId =
  | "portfolioName"
  | "instrumentName"
  | "accountType"
  | "custodyType"
  | "quantity"
  | "unitPrice10k"
  | "unitPrice"
  | "avgCost"
  | "marketValue"
  | "bookValue"
  | "weight"
  | "gain"
  | "gainRate"
  | "dividendOption";

export type PortfolioKindFeatures = {
  showContributions: boolean;
  showGainRateOnContributions: boolean;
  holdingLineColumns: HoldingLineColumnId[];
  instrumentAttributes: string[];
  portfolioMetrics: string[];
};

const IDECO_INSTRUMENT_ATTRIBUTES = [
  "short_name",
  "provider",
  "trust_fee_text",
  "trust_reserve_text",
] as const;

const DEFAULT_HOLDING_LINE_COLUMNS: HoldingLineColumnId[] = [
  "instrumentName",
  "quantity",
  "marketValue",
  "weight",
  "gain",
  "gainRate",
];

const KIND_FEATURES: Record<string, PortfolioKindFeatures> = {
  ideco: {
    showContributions: true,
    showGainRateOnContributions: true,
    holdingLineColumns: [
      "instrumentName",
      "quantity",
      "marketValue",
      "weight",
      "unitPrice10k",
      "gain",
      "gainRate",
    ],
    instrumentAttributes: [...IDECO_INSTRUMENT_ATTRIBUTES],
    portfolioMetrics: [IDECO_PORTFOLIO_METRIC_CODES.totalContributions],
  },
  monex: {
    showContributions: false,
    showGainRateOnContributions: false,
    holdingLineColumns: [
      "instrumentName",
      "accountType",
      "custodyType",
      "quantity",
      "unitPrice",
      "avgCost",
      "marketValue",
      "bookValue",
      "gain",
      "gainRate",
      "dividendOption",
    ],
    instrumentAttributes: [
      MONEX_INSTRUMENT_ATTRIBUTE_CODES.market,
      MONEX_INSTRUMENT_ATTRIBUTE_CODES.ticker,
    ],
    portfolioMetrics: [],
  },
  rakuten: {
    showContributions: false,
    showGainRateOnContributions: false,
    holdingLineColumns: [
      "instrumentName",
      "accountType",
      "quantity",
      "unitPrice",
      "avgCost",
      "marketValue",
      "bookValue",
      "gain",
      "gainRate",
    ],
    instrumentAttributes: [RAKUTEN_INSTRUMENT_ATTRIBUTE_CODES.ticker],
    portfolioMetrics: [],
  },
  "sbi-wrap": {
    showContributions: false,
    showGainRateOnContributions: false,
    holdingLineColumns: [
      "instrumentName",
      "accountType",
      "quantity",
      "marketValue",
      "bookValue",
      "weight",
      "gain",
      "gainRate",
    ],
    instrumentAttributes: [],
    portfolioMetrics: [],
  },
};

const DEFAULT_FEATURES: PortfolioKindFeatures = {
  showContributions: false,
  showGainRateOnContributions: false,
  holdingLineColumns: DEFAULT_HOLDING_LINE_COLUMNS,
  instrumentAttributes: [],
  portfolioMetrics: [],
};

export function getPortfolioKindFeatures(kind: string): PortfolioKindFeatures {
  let result = KIND_FEATURES[kind] ?? DEFAULT_FEATURES;
  return result;
}

export function shouldShowHoldingColumn(
  kind: string,
  columnId: HoldingLineColumnId,
): boolean {
  let result = false;
  const features = getPortfolioKindFeatures(kind);
  result = features.holdingLineColumns.includes(columnId);
  return result;
}

export function getHoldingUnitPriceMetricCode(kind: string): string | null {
  let result: string | null = null;

  if (shouldShowHoldingColumn(kind, "unitPrice10k")) {
    result = "unit_price_per_10k_lots";
    return result;
  }

  if (shouldShowHoldingColumn(kind, "unitPrice")) {
    result = "unit_price_minor";
  }

  return result;
}
