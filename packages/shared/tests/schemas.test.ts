import { describe, expect, it } from "vitest";

import {
  createPortfolioSchema,
  replaceCurrentSnapshotSchema,
  setInstrumentClassificationsSchema,
} from "../src/schemas";

describe("shared schemas", () => {
  it("validates portfolio input", () => {
    const valid = createPortfolioSchema.safeParse({
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });
    expect(valid.success).toBe(true);

    const invalid = createPortfolioSchema.safeParse({ code: "", name: "x", kind: "x" });
    expect(invalid.success).toBe(false);
  });

  it("validates snapshot and classifications", () => {
    const snapshot = replaceCurrentSnapshotSchema.safeParse({
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: "550e8400-e29b-41d4-a716-446655440000",
          quantity: 1,
          marketValueMinor: 1000,
        },
      ],
    });
    expect(snapshot.success).toBe(true);

    const tags = setInstrumentClassificationsSchema.safeParse({
      classificationValueIds: ["550e8400-e29b-41d4-a716-446655440001"],
    });
    expect(tags.success).toBe(true);
  });
});
