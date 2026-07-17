import { normalizeIdecoInstrumentMatchKey } from "./ideco-instrument-match";

export type SbiWrapInstrumentMatchCandidate = {
  id: string;
  name: string;
  accountId?: string | null;
};

export function buildSbiWrapInstrumentMatchKeys(name: string): string[] {
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

function matchExactName(
  candidates: SbiWrapInstrumentMatchCandidate[],
  instrumentName: string,
): string | null {
  let result: string | null = null;

  const matchKeys = buildSbiWrapInstrumentMatchKeys(instrumentName);
  if (matchKeys.length === 0) {
    return result;
  }

  for (const candidate of candidates) {
    const candidateKeys = buildSbiWrapInstrumentMatchKeys(candidate.name);
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

export function matchSbiWrapInstrumentId(
  candidates: SbiWrapInstrumentMatchCandidate[],
  instrumentName: string,
  options: { accountId?: string | null } = {},
): string | null {
  let result: string | null = null;

  const trimmedName = instrumentName.trim();
  if (trimmedName === "") {
    return result;
  }

  const accountId = options.accountId?.trim() ?? "";
  // 商品（accountId）ごとに銘柄を分ける。現金など同名銘柄が複数商品に出るため、
  // accountId 指定時は口座横断フォールバックをしない。
  if (accountId !== "") {
    const scoped = candidates.filter(
      (candidate) => (candidate.accountId?.trim() ?? "") === accountId,
    );
    result = matchExactName(scoped, trimmedName);
    return result;
  }

  result = matchExactName(candidates, trimmedName);
  return result;
}
