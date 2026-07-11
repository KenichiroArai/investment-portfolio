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

export function buildMonexInstrumentMatchKeys(name: string): string[] {
  let result: string[] = [];
  const keys = new Set<string>();

  const normalized = normalizeIdecoInstrumentMatchKey(name);
  if (normalized !== "") {
    keys.add(normalized);
  }

  const stripped = stripMonexTickerSuffix(name);
  if (stripped !== name) {
    const strippedKey = normalizeIdecoInstrumentMatchKey(stripped);
    if (strippedKey !== "") {
      keys.add(strippedKey);
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
