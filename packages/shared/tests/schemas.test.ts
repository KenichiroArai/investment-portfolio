import { describe, expect, it } from "vitest";

import {
  createPortfolioSchema,
  replaceCurrentSnapshotSchema,
  setInstrumentClassificationsSchema,
  updateClassificationSchemeSchema,
  updateClassificationValueSchema,
  updateInstrumentSchema,
  updatePortfolioSchema,
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

    const duplicateLines = replaceCurrentSnapshotSchema.safeParse({
      asOfDate: "2026-06-01",
      lines: [
        {
          instrumentId: "550e8400-e29b-41d4-a716-446655440000",
          quantity: 1,
          marketValueMinor: 1000,
        },
        {
          instrumentId: "550e8400-e29b-41d4-a716-446655440000",
          quantity: 2,
          marketValueMinor: 2000,
        },
      ],
    });
    expect(duplicateLines.success).toBe(false);

    const tags = setInstrumentClassificationsSchema.safeParse({
      classificationValueIds: ["550e8400-e29b-41d4-a716-446655440001"],
    });
    expect(tags.success).toBe(true);
  });

  it("validates update schemas", () => {
    const portfolio = updatePortfolioSchema.safeParse({
      name: "更新口座",
      kind: "nisa",
    });
    expect(portfolio.success).toBe(true);

    const scheme = updateClassificationSchemeSchema.safeParse({ name: "地域" });
    expect(scheme.success).toBe(true);

    const value = updateClassificationValueSchema.safeParse({
      name: "日本",
      sortOrder: 1,
    });
    expect(value.success).toBe(true);

    const instrument = updateInstrumentSchema.safeParse({ name: "銘柄A" });
    expect(instrument.success).toBe(true);
  });
});
