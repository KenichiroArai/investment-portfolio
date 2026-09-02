import {
  buildRakutenAccountId,
  buildRakutenAccountName,
} from "./rakuten-csv-utils";
import { finiteOrZero, type RakutenPasteProductKind } from "./rakuten-paste-utils";

export type RakutenHoldingPasteRow = {
  source: RakutenPasteProductKind;
  instrumentName: string;
  ticker: string | null;
  accountId: string;
  accountName: string;
  accountType: string;
  quantity: number;
  unitPriceMinor: number;
  avgCostMinor: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainMinor: number;
  unrealizedGainRate: number;
};

export type ParseRakutenPasteResult = {
  holdings: RakutenHoldingPasteRow[];
};

function resolveAccountFields(rawAccountType: string): {
  accountType: string;
  accountId: string;
  accountName: string;
} {
  let result = {
    accountType: "不明",
    accountId: "rakuten:unknown",
    accountName: "不明口座",
  };

  const normalized = rawAccountType.trim().normalize("NFKC");
  if (normalized === "-" || normalized === "") {
    result = {
      accountType: "ラップ",
      accountId: buildRakutenAccountId("ラップ"),
      accountName: buildRakutenAccountName("ラップ"),
    };
    return result;
  }

  result = {
    accountType: normalized,
    accountId: buildRakutenAccountId(normalized),
    accountName: buildRakutenAccountName(normalized),
  };
  return result;
}

export function finishRakutenPasteRow(params: {
  source: RakutenPasteProductKind;
  instrumentName: string;
  ticker: string | null;
  accountTypeRaw: string;
  quantity: number;
  unitPriceMinor: number;
  avgCostMinor: number;
  marketValueMinor: number;
  bookValueMinor: number;
  unrealizedGainRate: number;
}): RakutenHoldingPasteRow {
  let result: RakutenHoldingPasteRow;
  const account = resolveAccountFields(params.accountTypeRaw);
  const unrealizedGainMinor = params.marketValueMinor - params.bookValueMinor;
  let unrealizedGainRate = params.unrealizedGainRate;

  if (!Number.isFinite(unrealizedGainRate) && params.bookValueMinor > 0) {
    unrealizedGainRate = unrealizedGainMinor / params.bookValueMinor;
  }
  if (!Number.isFinite(unrealizedGainRate)) {
    unrealizedGainRate = 0;
  }

  result = {
    source: params.source,
    instrumentName: params.instrumentName,
    ticker: params.ticker,
    accountId: account.accountId,
    accountName: account.accountName,
    accountType: account.accountType,
    quantity: params.quantity,
    unitPriceMinor: finiteOrZero(params.unitPriceMinor),
    avgCostMinor: params.avgCostMinor,
    marketValueMinor: params.marketValueMinor,
    bookValueMinor: params.bookValueMinor,
    unrealizedGainMinor,
    unrealizedGainRate,
  };
  return result;
}

export function resolveRakutenAccountFieldsForTest(rawAccountType: string) {
  let result = resolveAccountFields(rawAccountType);
  return result;
}
