import { normalizeIdecoInstrumentMatchKey } from "./ideco-instrument-match";

export class SbiWrapPasteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SbiWrapPasteError";
  }
}

export function splitSbiWrapPasteLines(content: string): string[] {
  let result: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/\u00a0/g, " ").trim();
    if (line === "") {
      continue;
    }
    result.push(line);
  }

  return result;
}

export function parseSbiWrapYenAmount(raw: string): number | null {
  let result: number | null = null;
  const normalized = raw.replace(/,/g, "").replace(/\s+/g, "").trim();
  const match = /^([+-]?)(\d+)円$/.exec(normalized);

  if (!match) {
    return result;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const value = Number.parseInt(match[2], 10);
  if (!Number.isFinite(value)) {
    return result;
  }

  result = sign * value;
  return result;
}

export function parseSbiWrapAsOfDate(raw: string): string | null {
  let result: string | null = null;
  const match = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(raw);

  if (!match) {
    return result;
  }

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  result = `${year}-${month}-${day}`;
  return result;
}

export function isSbiWrapAssetBalanceHeader(line: string): boolean {
  let result = false;
  result = line === "資産残高";
  return result;
}

export function isSbiWrapCashLabel(line: string): boolean {
  let result = false;
  result = line === "現金";
  return result;
}

export function isSbiWrapSkipFund(name: string, marketValueMinor: number): boolean {
  let result = false;

  if (marketValueMinor !== 0) {
    return result;
  }

  const normalized = normalizeIdecoInstrumentMatchKey(name);
  if (normalized.includes("マネーファンド")) {
    result = true;
  }

  return result;
}

export function buildSbiWrapNameKey(instrumentName: string): string {
  let result = normalizeIdecoInstrumentMatchKey(instrumentName);
  result = result.replace(/\s+/g, "");
  return result;
}

function hashSbiWrapNameKey(nameKey: string): string {
  let hash = 0;

  for (let index = 0; index < nameKey.length; index += 1) {
    hash = (Math.imul(31, hash) + nameKey.charCodeAt(index)) | 0;
  }

  let result = Math.abs(hash).toString(36);
  return result;
}

/**
 * instruments の identity unique は account_id を含まないため、externalId で商品ごとに区別する。
 */
export function buildSbiWrapExternalId(
  accountId: string,
  instrumentName: string,
): string {
  let result = `account:${accountId}`;
  const nameKey = buildSbiWrapNameKey(instrumentName);

  if (nameKey === "") {
    return result;
  }

  const shortName = nameKey.slice(0, 48);
  const digest = hashSbiWrapNameKey(nameKey);
  result = `n:${shortName}:${digest}__${accountId}`;
  return result;
}
