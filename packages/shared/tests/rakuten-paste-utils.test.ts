import { describe, expect, it } from "vitest";

import {
  detectRakutenBlockKind,
  detectRakutenPasteFormat,
  isRakutenAccountTypeLabel,
  isRakutenHeaderLine,
  isRakutenPageMutualFundNameLine,
  isRakutenPageNoiseLine,
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
    expect(isRakutenPageNoiseLine("315")).toBe(false);
    expect(isRakutenPageNoiseLine("")).toBe(true);
    expect(isRakutenPageNoiseLine("   ")).toBe(true);
    expect(isRakutenPageNoiseLine("現金等［円］")).toBe(true);
    expect(isRakutenPageNoiseLine("0.00 USD")).toBe(true);
    expect(isRakutenPageNoiseLine("米ドル")).toBe(true);
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

  it("rejects money fund and cash lines as mutual fund name lines", () => {
    expect(isRakutenPageMutualFundNameLine("楽天・マネーファンド")).toBe(false);
    expect(isRakutenPageMutualFundNameLine("楽天・マネーファンド（追加）")).toBe(false);
    expect(isRakutenPageMutualFundNameLine("現金等")).toBe(false);
    expect(isRakutenPageMutualFundNameLine("現金等［円］")).toBe(false);
    expect(isRakutenPageMutualFundNameLine("1489")).toBe(false);
    expect(isRakutenPageMutualFundNameLine("【楽ラップ専用】テスト＜ラップ専用＞")).toBe(
      false,
    );
    expect(isRakutenPageMutualFundNameLine("個人国債　変動10年　第195回")).toBe(false);
    expect(isRakutenPageMutualFundNameLine("テストオープンファンド")).toBe(true);
  });

  it("treats short fund header rows as non-legacy and non-blocks", () => {
    expect(detectRakutenPasteFormat(["投資信託\tテストファンド"])).toBe("legacy");
    expect(detectRakutenPasteFormat(["楽天・マネーファンド\t楽天・マネーファンド"])).toBe(
      "legacy",
    );
    expect(detectRakutenBlockKind(["楽天・マネーファンド"], 0)).toBeNull();
    expect(
      detectRakutenBlockKind(["楽天・マネーファンド\t楽天・マネーファンド"], 0),
    ).toBeNull();
  });
});
