import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ideco-instrument-match", () => ({
  normalizeIdecoInstrumentMatchKey: vi.fn(() => ""),
}));

import { matchSbiWrapInstrumentId } from "../src/sbi-wrap-instrument-match";

describe("sbi-wrap-instrument-match coverage", () => {
  it("returns null when normalized keys are empty", () => {
    expect(matchSbiWrapInstrumentId([{ id: "x", name: "A" }], "テスト")).toBeNull();
  });
});
