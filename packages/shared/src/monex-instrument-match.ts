import { normalizeIdecoInstrumentMatchKey } from "./ideco-instrument-match";

export type MonexInstrumentMatchCandidate = {
  id: string;
  name: string;
};

export function stripMonexTickerSuffix(name: string): string {
  let result = name;

  const match = /^(.*?)（[^（）]+）\s*$/u.exec(name.trim());
  if (!match) {
    return result;
  }

  result = match[1].trim();
  return result;
}

/** 為替ヘッジあり/なしの表記ゆれを除いたキー用名称 */
export function stripMonexFxHedgeVariant(name: string): string {
  let result = name.trim();
  result = result.replace(/＜為替ヘッジ(?:あり|なし)＞/gu, "");
  result = result.replace(/<為替ヘッジ(?:あり|なし)>/gu, "");
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

export function buildMonexInstrumentMatchKeys(name: string): string[] {
  let result: string[] = [];
  const keys = new Set<string>();

  const addKey = (raw: string): void => {
    let addResult: void = undefined;
    const normalized = normalizeIdecoInstrumentMatchKey(raw);
    if (normalized !== "") {
      keys.add(normalized);
    }
    return addResult;
  };

  addKey(name);

  const strippedTicker = stripMonexTickerSuffix(name);
  if (strippedTicker !== name) {
    addKey(strippedTicker);
  }

  const strippedHedge = stripMonexFxHedgeVariant(name);
  if (strippedHedge !== name) {
    addKey(strippedHedge);
    const strippedHedgeTicker = stripMonexTickerSuffix(strippedHedge);
    if (strippedHedgeTicker !== strippedHedge) {
      addKey(strippedHedgeTicker);
    }
  }

  result = [...keys];
  return result;
}

export function matchMonexInstrumentId(
  candidates: MonexInstrumentMatchCandidate[],
  instrumentName: string,
  additionalNames: string[] = [],
): string | null {
  let result: string | null = null;

  const trimmedName = instrumentName.trim();
  if (trimmedName === "") {
    return result;
  }

  const sourceNames = [trimmedName, ...additionalNames];
  const matchKeySet = new Set<string>();
  for (const sourceName of sourceNames) {
    const keys = buildMonexInstrumentMatchKeys(sourceName);
    for (const key of keys) {
      matchKeySet.add(key);
    }
  }
  const matchKeys = [...matchKeySet];
  /* v8 ignore start */
  if (matchKeys.length === 0) {
    return result;
  }
  /* v8 ignore stop */

  for (const candidate of candidates) {
    const candidateKeys = buildMonexInstrumentMatchKeys(candidate.name);
    for (const matchKey of matchKeys) {
      for (const candidateKey of candidateKeys) {
        if (matchKey === candidateKey) {
          result = candidate.id;
          return result;
        }
      }
    }
  }

  for (const candidate of candidates) {
    const candidateKey = normalizeIdecoInstrumentMatchKey(candidate.name);
    for (const matchKey of matchKeys) {
      if (
        matchKey.startsWith(candidateKey) ||
        candidateKey.startsWith(matchKey)
      ) {
        result = candidate.id;
        return result;
      }
    }
  }

  return result;
}
