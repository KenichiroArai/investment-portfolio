import { describe, expect, it } from "vitest";

import {
  assertUniqueSnapshotInstrumentIds,
  findDuplicateInstrumentAccountPair,
  findDuplicateInstrumentId,
  SnapshotValidationError,
} from "../src/snapshot-line-validation";

describe("snapshot line validation", () => {
  it("returns null when instrument account pairs are unique", () => {
    let result = findDuplicateInstrumentAccountPair([
      { instrumentId: "inst-1", accountId: "acct-a" },
      { instrumentId: "inst-2", accountId: "acct-a" },
    ]);
    expect(result).toBeNull();
  });

  it("allows the same instrument id across different accounts", () => {
    let result = findDuplicateInstrumentAccountPair([
      { instrumentId: "inst-1", accountId: "acct-a" },
      { instrumentId: "inst-1", accountId: "acct-b" },
    ]);
    expect(result).toBeNull();
  });

  it("returns duplicate instrument account pair", () => {
    let result = findDuplicateInstrumentAccountPair([
      { instrumentId: "inst-1", accountId: "acct-a" },
      { instrumentId: "inst-2", accountId: "acct-a" },
      { instrumentId: "inst-1", accountId: "acct-a" },
    ]);
    expect(result).toEqual({ instrumentId: "inst-1", accountId: "acct-a" });
  });

  it("returns null for legacy findDuplicateInstrumentId when only account differs", () => {
    let result = findDuplicateInstrumentId([
      { instrumentId: "inst-1", accountId: "acct-a" },
      { instrumentId: "inst-1", accountId: "acct-b" },
    ]);
    expect(result).toBeNull();
  });

  it("returns duplicate instrument id for legacy helper when account matches", () => {
    let result = findDuplicateInstrumentId([
      { instrumentId: "inst-1", accountId: "acct-a" },
      { instrumentId: "inst-1", accountId: "acct-a" },
    ]);
    expect(result).toBe("inst-1");
  });

  it("throws SnapshotValidationError for duplicate instrument account pairs", () => {
    expect(() =>
      assertUniqueSnapshotInstrumentIds([
        { instrumentId: "inst-1", accountId: "acct-a" },
        { instrumentId: "inst-1", accountId: "acct-a" },
      ]),
    ).toThrow(SnapshotValidationError);
  });
});
