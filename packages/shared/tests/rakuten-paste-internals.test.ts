import { describe, expect, it } from "vitest";

import {
  finishRakutenPasteRowForTest,
  readRakutenGainRateLineForTest,
  resolveRakutenAccountFieldsForTest,
  skipRakutenTrailingDashForTest,
} from "../src/rakuten-paste";

describe("rakuten-paste internals", () => {
  it("resolves account fields for wrap and standard accounts", () => {
    expect(resolveRakutenAccountFieldsForTest("-")).toEqual({
      accountType: "ラップ",
      accountId: "rakuten:ラップ",
      accountName: "楽ラップ",
    });
    expect(resolveRakutenAccountFieldsForTest("")).toEqual({
      accountType: "ラップ",
      accountId: "rakuten:ラップ",
      accountName: "楽ラップ",
    });
    expect(resolveRakutenAccountFieldsForTest("特定")).toEqual({
      accountType: "特定",
      accountId: "rakuten:特定",
      accountName: "特定",
    });
  });

  it("finishes rows with computed and fallback gain rates", () => {
    const computed = finishRakutenPasteRowForTest({
      source: "domestic_equity",
      instrumentName: "テスト",
      ticker: "1489",
      accountTypeRaw: "特定",
      quantity: 1,
      unitPriceMinor: Number.NaN,
      avgCostMinor: 3000,
      marketValueMinor: 3100,
      bookValueMinor: 3000,
      unrealizedGainRate: Number.NaN,
    });
    expect(computed.unitPriceMinor).toBe(0);
    expect(computed.unrealizedGainRate).toBeCloseTo(100 / 3000);

    const zeroBook = finishRakutenPasteRowForTest({
      source: "wrap_cash",
      instrumentName: "現金等",
      ticker: null,
      accountTypeRaw: "-",
      quantity: 1,
      unitPriceMinor: 0,
      avgCostMinor: 0,
      marketValueMinor: 0,
      bookValueMinor: 0,
      unrealizedGainRate: Number.NaN,
    });
    expect(zeroBook.unrealizedGainRate).toBe(0);

    const explicit = finishRakutenPasteRowForTest({
      source: "domestic_equity",
      instrumentName: "テスト",
      ticker: "1489",
      accountTypeRaw: "特定",
      quantity: 1,
      unitPriceMinor: 3100,
      avgCostMinor: 3000,
      marketValueMinor: 3100,
      bookValueMinor: 3000,
      unrealizedGainRate: 0.05,
    });
    expect(explicit.unrealizedGainRate).toBe(0.05);
  });

  it("reads gain rate lines and skips trailing dashes", () => {
    expect(readRakutenGainRateLineForTest(["+1.00 ％"], 0)).toEqual({
      rate: 0.01,
      nextIndex: 1,
    });
    expect(readRakutenGainRateLineForTest(["---"], 0)).toEqual({
      rate: Number.NaN,
      nextIndex: 1,
    });
    expect(readRakutenGainRateLineForTest(["+44 円"], 0)).toEqual({
      rate: Number.NaN,
      nextIndex: 0,
    });
    expect(readRakutenGainRateLineForTest([], 0)).toEqual({
      rate: Number.NaN,
      nextIndex: 0,
    });

    expect(skipRakutenTrailingDashForTest(["---", "-", "100 円"], 0)).toBe(2);
    expect(skipRakutenTrailingDashForTest(["100 円"], 0)).toBe(0);
  });
});
