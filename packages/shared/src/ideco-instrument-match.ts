export type IdecoInstrumentMatchCandidate = {
  id: string;
  name: string;
  shortName: string | null;
};

export function normalizeIdecoInstrumentMatchKey(text: string): string {
  let result = text.trim();
  result = result.normalize("NFKC");
  result = result.replace(/\u3000/g, " ");
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

export function stripIdecoPasteDuplicateSuffix(pasteName: string): string {
  let result = pasteName;

  const hasDuplicateSuffix = /[）)]\s*（[^（]*）\s*$/u.test(pasteName);
  if (!hasDuplicateSuffix) {
    return result;
  }

  result = pasteName.replace(/（[^（]*）\s*$/u, "").trim();
  return result;
}

export function extractTrailingParentheticalContent(text: string): string | null {
  let result: string | null = null;

  const match = /[（(]([^（）()]*)[）)]\s*$/u.exec(text);
  if (!match) {
    return result;
  }

  const candidate = match[1].trim();
  if (candidate === "") {
    return result;
  }

  result = candidate;
  return result;
}

function addPasteMatchKey(keys: Set<string>, raw: string): void {
  let result: void = undefined;

  const normalized = normalizeIdecoInstrumentMatchKey(raw);
  if (normalized !== "") {
    keys.add(normalized);
  }

  const trailing = extractTrailingParentheticalContent(raw);
  if (trailing !== null) {
    const trailingKey = normalizeIdecoInstrumentMatchKey(trailing);
    if (trailingKey !== "") {
      keys.add(trailingKey);
    }
  }

  return result;
}

function buildPasteMatchKeys(pasteName: string): string[] {
  let result: string[] = [];

  const keys = new Set<string>();
  addPasteMatchKey(keys, pasteName);

  const stripped = stripIdecoPasteDuplicateSuffix(pasteName);
  if (stripped !== pasteName) {
    addPasteMatchKey(keys, stripped);
  }

  result = [...keys];
  return result;
}

export function matchIdecoInstrumentId(
  candidates: IdecoInstrumentMatchCandidate[],
  pasteName: string,
): string | null {
  let result: string | null = null;

  const trimmedPasteName = pasteName.trim();
  if (trimmedPasteName === "") {
    return result;
  }

  const pasteKeys = buildPasteMatchKeys(trimmedPasteName);
  if (pasteKeys.length === 0) {
    return result;
  }

  for (const candidate of candidates) {
    const nameKey = normalizeIdecoInstrumentMatchKey(candidate.name);
    const shortNameKey =
      candidate.shortName !== null
        ? normalizeIdecoInstrumentMatchKey(candidate.shortName)
        : null;

    for (const pasteKey of pasteKeys) {
      if (pasteKey === nameKey) {
        result = candidate.id;
        return result;
      }

      if (shortNameKey !== null && pasteKey === shortNameKey) {
        result = candidate.id;
        return result;
      }
    }
  }

  for (const candidate of candidates) {
    const nameKey = normalizeIdecoInstrumentMatchKey(candidate.name);

    for (const pasteKey of pasteKeys) {
      if (pasteKey.startsWith(nameKey)) {
        result = candidate.id;
        return result;
      }
    }
  }

  return result;
}
