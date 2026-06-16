import { describe, expect, it } from "vitest";

import {
  assertUniqueSnapshotInstrumentIds,
  findDuplicateInstrumentId,
  SnapshotValidationError,
} from "../src/snapshot-line-validation";

describe("snapshot line validation", () => {
  it("returns null when instrument ids are unique", () => {
    let result = findDuplicateInstrumentId([
      { instrumentId: "inst-1" },
      { instrumentId: "inst-2" },
    ]);
    expect(result).toBeNull();
  });

  it("returns duplicate instrument id", () => {
    let result = findDuplicateInstrumentId([
      { instrumentId: "inst-1" },
      { instrumentId: "inst-2" },
      { instrumentId: "inst-1" },
    ]);
    expect(result).toBe("inst-1");
  });

  it("throws SnapshotValidationError for duplicate instrument ids", () => {
    expect(() =>
      assertUniqueSnapshotInstrumentIds([
        { instrumentId: "inst-1" },
        { instrumentId: "inst-1" },
      ]),
    ).toThrow(SnapshotValidationError);
  });
});
