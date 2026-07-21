import { describe, expect, it, vi } from "vitest";

import {
  buildSbiWrapExternalId,
  isSbiWrapAssetBalanceHeader,
  isSbiWrapCashLabel,
  isSbiWrapSkipFund,
  parseSbiWrapAsOfDate,
  parseSbiWrapYenAmount,
  SbiWrapPasteError,
  splitSbiWrapPasteLines,
} from "../src/sbi-wrap-paste-utils";

describe("sbi-wrap-paste-utils", () => {
  it("creates SbiWrapPasteError with name", () => {
    const error = new SbiWrapPasteError("test");
    expect(error.name).toBe("SbiWrapPasteError");
  });

  it("splits lines and detects headers", () => {
    expect(splitSbiWrapPasteLines("a\n\nb")).toEqual(["a", "b"]);
    expect(isSbiWrapAssetBalanceHeader("資産残高")).toBe(true);
    expect(isSbiWrapCashLabel("現金")).toBe(true);
  });

  it("parses yen amounts and as-of dates", () => {
    expect(parseSbiWrapYenAmount("1,617円")).toBe(1617);
    expect(parseSbiWrapYenAmount("-208円")).toBe(-208);
    expect(parseSbiWrapYenAmount("invalid")).toBeNull();
    vi.spyOn(Number, "parseInt").mockReturnValueOnce(Number.NaN);
    expect(parseSbiWrapYenAmount("123円")).toBeNull();
    vi.restoreAllMocks();
    expect(parseSbiWrapAsOfDate("2026/07/17 時点")).toBe("2026-07-17");
    expect(parseSbiWrapAsOfDate("invalid")).toBeNull();
  });

  it("skips zero money funds and builds external ids", () => {
    expect(isSbiWrapSkipFund("マネーファンド（ラップ専用）", 0)).toBe(true);
    expect(isSbiWrapSkipFund("マネーファンド（ラップ専用）", 100)).toBe(false);
    expect(buildSbiWrapExternalId("sbi-wrap:AI投資", "")).toBe("account:sbi-wrap:AI投資");
    expect(buildSbiWrapExternalId("sbi-wrap:AI投資", "（ラップ専用）ＳＢＩ・米国株式")).toMatch(
      /^n:/,
    );
  });
});
