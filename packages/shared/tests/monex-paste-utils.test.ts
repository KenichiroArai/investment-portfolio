import { describe, expect, it } from "vitest";

import {
  detectMonexPasteSectionKind,
  parseMonexPasteInteger,
  parseMonexPastePercentRate,
} from "../src/index";

describe("monex paste utils", () => {
  it("parses integers and returns NaN for placeholders", () => {
    expect(parseMonexPasteInteger("9,913円")).toBe(9913);
    expect(parseMonexPasteInteger("+122")).toBe(122);
    expect(Number.isNaN(parseMonexPasteInteger(""))).toBe(true);
    expect(Number.isNaN(parseMonexPasteInteger("-"))).toBe(true);
    expect(Number.isNaN(parseMonexPasteInteger("---"))).toBe(true);
  });

  it("parses percent rates and returns NaN for invalid values", () => {
    expect(parseMonexPastePercentRate("+12.5%")).toBeCloseTo(0.125, 6);
    expect(parseMonexPastePercentRate("-5.94％")).toBeCloseTo(-0.0594, 6);
    expect(Number.isNaN(parseMonexPastePercentRate(""))).toBe(true);
    expect(Number.isNaN(parseMonexPastePercentRate("-"))).toBe(true);
    expect(Number.isNaN(parseMonexPastePercentRate("---%"))).toBe(true);
    expect(Number.isNaN(parseMonexPastePercentRate("abc%"))).toBe(true);
  });

  it("detects asset class sections without arrow markers", () => {
    expect(detectMonexPasteSectionKind(["保有比率", "国内株式全体"])).toBe(
      "asset_class",
    );
  });
});
