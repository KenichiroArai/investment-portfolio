import { normalizeIdecoInstrumentMatchKey } from "./ideco-instrument-match";

export class RakutenPasteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RakutenPasteError";
  }
}

export function normalizeRakutenAccountLabel(value: string): string {
  let result = value.trim().normalize("NFKC");
  result = result.replace(/\s+/g, "");
  return result;
}

export function buildRakutenAccountId(accountType: string): string {
  let result = "rakuten:unknown";
  const normalized = normalizeRakutenAccountLabel(accountType);

  if (normalized === "" || normalized === "-") {
    return result;
  }

  if (normalized === "ラップ") {
    result = "rakuten:ラップ";
    return result;
  }

  result = `rakuten:${normalized}`;
  return result;
}

export function buildRakutenAccountName(accountType: string): string {
  let result = "不明口座";
  const normalized = normalizeRakutenAccountLabel(accountType);

  if (normalized === "" || normalized === "-") {
    return result;
  }

  if (normalized === "ラップ") {
    result = "楽ラップ";
    return result;
  }

  result = normalized;
  return result;
}

/**
 * 同一銘柄を特定/一般など口座区分ごとに別マスタ登録できるようにする。
 * instruments の identity unique は account_id を含まないため、externalId で区別する。
 * ティッカーが無い投信・楽ラップは名称キーも含め、同口座内の別名柄が衝突しないようにする。
 */
export function buildRakutenNameKey(instrumentName: string): string {
  let result = normalizeIdecoInstrumentMatchKey(instrumentName);
  result = result.replace(/\s+/g, "");
  return result;
}

function hashRakutenNameKey(nameKey: string): string {
  let hash = 0;

  for (let index = 0; index < nameKey.length; index += 1) {
    hash = (Math.imul(31, hash) + nameKey.charCodeAt(index)) | 0;
  }

  let result = Math.abs(hash).toString(36);
  return result;
}

export function buildRakutenExternalId(
  ticker: string | null | undefined,
  accountId: string,
  instrumentName?: string | null,
): string {
  let result = `account:${accountId}`;
  const normalizedTicker = ticker?.trim() ?? "";

  if (normalizedTicker !== "") {
    result = `${normalizedTicker}__${accountId}`;
    return result;
  }

  const nameKey = buildRakutenNameKey(instrumentName ?? "");
  if (nameKey === "") {
    return result;
  }

  const shortName = nameKey.slice(0, 48);
  const digest = hashRakutenNameKey(nameKey);
  result = `n:${shortName}:${digest}__${accountId}`;
  return result;
}

/** externalId から表示・突合用の銘柄コードを取り出す */
export function extractRakutenTickerFromExternalId(
  externalId: string | null | undefined,
): string | null {
  let result: string | null = null;
  const raw = externalId?.trim() ?? "";

  if (raw === "" || raw.startsWith("account:")) {
    return result;
  }

  const separatorIndex = raw.indexOf("__");
  if (separatorIndex === -1) {
    result = raw;
    return result;
  }

  const ticker = raw.slice(0, separatorIndex).trim();
  if (ticker === "") {
    return result;
  }

  result = ticker;
  return result;
}
