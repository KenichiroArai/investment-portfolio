import { describe, expect, it } from "vitest";

import {
  buildMonexInstrumentMatchKeys,
  matchMonexInstrumentId,
  stripMonexTickerSuffix,
} from "../src/monex-instrument-match";

describe("monex-instrument-match", () => {
  it("strips ticker suffix from monex names", () => {
    expect(stripMonexTickerSuffix("銘柄A（1234）")).toBe("銘柄A");
    expect(stripMonexTickerSuffix("銘柄A")).toBe("銘柄A");
  });

  it("builds match keys from stripped ticker suffix", () => {
    const keys = buildMonexInstrumentMatchKeys("銘柄A（1234）");
    expect(keys.length).toBeGreaterThan(0);
  });

  it("matches by exact normalized key", () => {
    expect(
      matchMonexInstrumentId(
        [{ id: "inst-1", name: "eMAXIS Slim 全世界" }],
        "ｅＭＡＸＩＳ Ｓｌｉｍ 全世界",
      ),
    ).toBe("inst-1");
  });

  it("falls back to prefix match", () => {
    expect(
      matchMonexInstrumentId([{ id: "inst-2", name: "短い名前" }], "短い名前（追加情報）"),
    ).toBe("inst-2");
  });

  it("returns null for empty or unmatched names", () => {
    expect(matchMonexInstrumentId([], "  ")).toBeNull();
    expect(matchMonexInstrumentId([{ id: "x", name: "A" }], "B")).toBeNull();
    expect(matchMonexInstrumentId([], "（1234）")).toBeNull();
  });

  it("matches when candidate key is a prefix of the match key", () => {
    expect(
      matchMonexInstrumentId([{ id: "inst-3", name: "短" }], "短い正式名称"),
    ).toBe("inst-3");
  });
});
