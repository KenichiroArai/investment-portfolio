import { describe, expect, it } from "vitest";

import {
  detectRakutenBlockKind,
  isRakutenAccountTypeLabel,
  isRakutenHeaderLine,
  isRakutenStockCode,
  parseRakutenPasteNumber,
  parseRakutenPastePercentRate,
  finiteOrZero,
  splitRakutenPasteCells,
  splitRakutenPasteLines,
} from "../src/rakuten-paste-utils";

describe("rakuten-paste-utils", () => {
  it("splits lines and skips empty rows", () => {
    expect(splitRakutenPasteLines("a\n\nb")).toEqual(["a", "b"]);
    expect(splitRakutenPasteCells("a\tb")).toEqual(["a", "b"]);
  });

  it("detects header and account type labels", () => {
    expect(isRakutenHeaderLine("種別\t銘柄")).toBe(true);
    expect(isRakutenHeaderLine("前日比")).toBe(true);
    expect(isRakutenAccountTypeLabel("特定")).toBe(true);
    expect(isRakutenAccountTypeLabel("NISA成長")).toBe(true);
    expect(isRakutenAccountTypeLabel("つみたてNISA")).toBe(true);
    expect(isRakutenAccountTypeLabel("ラップ")).toBe(false);
  });

  it("parses numbers and percent rates", () => {
    expect(parseRakutenPasteNumber("3,285.00 円")).toBe(3285);
    expect(parseRakutenPasteNumber("-")).toBeNaN();
    expect(parseRakutenPasteNumber("abc")).toBeNaN();
    expect(parseRakutenPastePercentRate("+1.33 ％")).toBeCloseTo(0.0133);
    expect(parseRakutenPastePercentRate("-")).toBeNaN();
    expect(parseRakutenPastePercentRate("abc")).toBeNaN();
    expect(finiteOrZero(120)).toBe(120);
    expect(finiteOrZero(Number.NaN)).toBe(0);
  });

  it("detects stock codes", () => {
    expect(isRakutenStockCode("1489")).toBe(true);
    expect(isRakutenStockCode("ABCD")).toBe(false);
  });

  it("returns null for standalone MMF rows without foreign section", () => {
    const lines = ["MMF\tGS米ドル\t特定\t1 口\t100 円"];
    expect(detectRakutenBlockKind(lines, 0)).toBeNull();
  });

  it("detects block kinds including fx mmf and wrap cash", () => {
    const lines = [
      "外貨建",
      "MMF\tGS米ドル\t特定\t1 口\t100 円",
      "楽ラップ",
      "現金等",
      "-",
      "313 円",
    ];
    expect(detectRakutenBlockKind(lines, 0)).toBe("fx_mmf");
    expect(detectRakutenBlockKind(lines, 1)).toBe("fx_mmf");
    expect(detectRakutenBlockKind(lines, 2)).toBe("wrap_cash");
  });
});
