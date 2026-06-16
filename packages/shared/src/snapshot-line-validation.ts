export class SnapshotValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnapshotValidationError";
  }
}

export type SnapshotLineInstrumentRef = {
  instrumentId: string;
};

export function findDuplicateInstrumentId(
  lines: SnapshotLineInstrumentRef[],
): string | null {
  let result: string | null = null;
  const seen = new Set<string>();

  for (const line of lines) {
    if (seen.has(line.instrumentId)) {
      result = line.instrumentId;
      return result;
    }
    seen.add(line.instrumentId);
  }

  return result;
}

export function assertUniqueSnapshotInstrumentIds(
  lines: SnapshotLineInstrumentRef[],
): void {
  let result: void = undefined;

  const duplicateId = findDuplicateInstrumentId(lines);
  if (duplicateId) {
    throw new SnapshotValidationError(
      `同一銘柄が複数行に含まれています（instrumentId: ${duplicateId}）`,
    );
  }

  return result;
}
