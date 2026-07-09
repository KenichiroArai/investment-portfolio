export class SnapshotValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotValidationError";
  }
}

export type SnapshotLineInstrumentRef = {
  instrumentId: string;
  accountId: string;
};

export type DuplicateInstrumentAccountPair = {
  instrumentId: string;
  accountId: string;
};

export function findDuplicateInstrumentAccountPair(
  lines: SnapshotLineInstrumentRef[],
): DuplicateInstrumentAccountPair | null {
  let result: DuplicateInstrumentAccountPair | null = null;
  const seen = new Set<string>();

  for (const line of lines) {
    const key = `${line.instrumentId}\0${line.accountId}`;
    if (seen.has(key)) {
      result = {
        instrumentId: line.instrumentId,
        accountId: line.accountId,
      };
      return result;
    }
    seen.add(key);
  }

  return result;
}

/** @deprecated Use findDuplicateInstrumentAccountPair */
export function findDuplicateInstrumentId(
  lines: Array<{ instrumentId: string; accountId?: string }>,
): string | null {
  let result: string | null = null;

  const normalized = lines.map((line) => ({
    instrumentId: line.instrumentId,
    accountId: line.accountId ?? "",
  }));
  const duplicatePair = findDuplicateInstrumentAccountPair(normalized);
  if (!duplicatePair) {
    return result;
  }

  result = duplicatePair.instrumentId;
  return result;
}

export function assertUniqueSnapshotInstrumentIds(
  lines: SnapshotLineInstrumentRef[],
): void {
  let result: void = undefined;

  const duplicatePair = findDuplicateInstrumentAccountPair(lines);
  if (!duplicatePair) {
    return result;
  }

  throw new SnapshotValidationError(
    `同一銘柄が同一口座内で複数行に含まれています（instrumentId: ${duplicatePair.instrumentId}, accountId: ${duplicatePair.accountId}）`,
  );
}
