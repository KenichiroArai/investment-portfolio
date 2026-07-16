import { normalizeIdecoInstrumentMatchKey } from "./ideco-instrument-match";
import { extractRakutenTickerFromExternalId } from "./rakuten-csv-utils";

export type RakutenInstrumentMatchCandidate = {
  id: string;
  name: string;
  ticker?: string | null;
  accountId?: string | null;
  externalId?: string | null;
};

export function buildRakutenInstrumentMatchKeys(name: string): string[] {
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
  result = [...keys];
  return result;
}

function resolveCandidateTicker(candidate: RakutenInstrumentMatchCandidate): string {
  let result = candidate.ticker?.trim() ?? "";

  if (result !== "") {
    return result;
  }

  result = extractRakutenTickerFromExternalId(candidate.externalId) ?? "";
  return result;
}

function matchExactName(
  candidates: RakutenInstrumentMatchCandidate[],
  instrumentName: string,
  additionalNames: string[],
): string | null {
  let result: string | null = null;

  const sourceNames = [instrumentName, ...additionalNames];
  const matchKeySet = new Set<string>();
  for (const sourceName of sourceNames) {
    for (const key of buildRakutenInstrumentMatchKeys(sourceName)) {
      matchKeySet.add(key);
    }
  }
  const matchKeys = [...matchKeySet];
  if (matchKeys.length === 0) {
    return result;
  }

  for (const candidate of candidates) {
    const candidateKeys = buildRakutenInstrumentMatchKeys(candidate.name);
    for (const matchKey of matchKeys) {
      for (const candidateKey of candidateKeys) {
        if (matchKey === candidateKey) {
          result = candidate.id;
          return result;
        }
      }
    }
  }

  return result;
}

function matchWithinCandidates(
  candidates: RakutenInstrumentMatchCandidate[],
  instrumentName: string,
  options: { ticker?: string | null; additionalNames?: string[] },
): string | null {
  let result: string | null = null;

  const trimmedName = instrumentName.trim();
  if (trimmedName === "") {
    return result;
  }

  const additionalNames = options.additionalNames ?? [];
  const ticker = options.ticker?.trim() ?? "";

  // 銘柄コードがある場合は、同じコードの候補の中で名称完全一致を優先する
  if (ticker !== "") {
    const tickerKey = normalizeIdecoInstrumentMatchKey(ticker);
    const tickerMatches = candidates.filter((candidate) => {
      let filterResult = false;
      const candidateTicker = resolveCandidateTicker(candidate);
      if (candidateTicker === "") {
        return filterResult;
      }
      filterResult = normalizeIdecoInstrumentMatchKey(candidateTicker) === tickerKey;
      return filterResult;
    });

    if (tickerMatches.length === 1) {
      result = tickerMatches[0].id;
      return result;
    }

    if (tickerMatches.length > 1) {
      result = matchExactName(tickerMatches, trimmedName, additionalNames);
      if (result) {
        return result;
      }
    }
  }

  // 楽ラップ等は名称が似ているため、前方一致は使わず完全一致のみ
  result = matchExactName(candidates, trimmedName, additionalNames);
  return result;
}

export function matchRakutenInstrumentId(
  candidates: RakutenInstrumentMatchCandidate[],
  instrumentName: string,
  options: {
    ticker?: string | null;
    accountId?: string | null;
    additionalNames?: string[];
  } = {},
): string | null {
  let result: string | null = null;

  const accountId = options.accountId?.trim() ?? "";
  if (accountId !== "") {
    const scoped = candidates.filter(
      (candidate) => (candidate.accountId?.trim() ?? "") === accountId,
    );
    result = matchWithinCandidates(scoped, instrumentName, options);
    if (result) {
      return result;
    }
  }

  result = matchWithinCandidates(candidates, instrumentName, options);
  return result;
}
