import { describe, expect, it, vi } from "vitest";

vi.mock("../src/ideco-instrument-match", () => ({
  normalizeIdecoInstrumentMatchKey: vi.fn(() => ""),
}));

import { matchRakutenInstrumentId } from "../src/rakuten-instrument-match";

describe("rakuten-instrument-match coverage", () => {
  it("returns null when normalized keys are empty", () => {
    expect(matchRakutenInstrumentId([{ id: "x", name: "A" }], "テスト")).toBeNull();
  });
});
