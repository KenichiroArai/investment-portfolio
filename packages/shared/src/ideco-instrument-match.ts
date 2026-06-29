export type IdecoInstrumentMatchCandidate = {
  id: string;
  name: string;
  shortName: string | null;
};

function extractTrailingAsciiShortName(pasteName: string): string | null {
  let result: string | null = null;

  const match = /（([^（）\u3040-\u30ff\u4e00-\u9fff]+)）\s*$/.exec(pasteName);
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

export function matchIdecoInstrumentId(
  candidates: IdecoInstrumentMatchCandidate[],
  pasteName: string,
): string | null {
  let result: string | null = null;

  const trimmedPasteName = pasteName.trim();
  if (trimmedPasteName === "") {
    return result;
  }

  for (const candidate of candidates) {
    if (candidate.name === trimmedPasteName) {
      result = candidate.id;
      return result;
    }
  }

  for (const candidate of candidates) {
    if (candidate.shortName !== null && candidate.shortName === trimmedPasteName) {
      result = candidate.id;
      return result;
    }
  }

  const extractedShortName = extractTrailingAsciiShortName(trimmedPasteName);
  if (extractedShortName !== null) {
    for (const candidate of candidates) {
      if (candidate.shortName === extractedShortName) {
        result = candidate.id;
        return result;
      }
    }

    for (const candidate of candidates) {
      if (candidate.name === extractedShortName) {
        result = candidate.id;
        return result;
      }
    }
  }

  for (const candidate of candidates) {
    if (trimmedPasteName.startsWith(candidate.name)) {
      result = candidate.id;
      return result;
    }
  }

  return result;
}
