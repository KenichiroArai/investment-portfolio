import { describe, expect, it } from "vitest";

import {
  buildRakutenAccountId,
  buildRakutenAccountName,
  buildRakutenExternalId,
  buildRakutenNameKey,
  extractRakutenTickerFromExternalId,
  RakutenPasteError,
} from "../src/rakuten-csv-utils";

describe("rakuten-csv-utils", () => {
  it("creates RakutenPasteError with name", () => {
    const error = new RakutenPasteError("test");
    expect(error.name).toBe("RakutenPasteError");
    expect(error.message).toBe("test");
  });

  it("builds account id and name for empty and wrap accounts", () => {
    expect(buildRakutenAccountId("")).toBe("rakuten:unknown");
    expect(buildRakutenAccountId("-")).toBe("rakuten:unknown");
    expect(buildRakutenAccountId("ラップ")).toBe("rakuten:ラップ");
    expect(buildRakutenAccountName("")).toBe("不明口座");
    expect(buildRakutenAccountName("-")).toBe("不明口座");
    expect(buildRakutenAccountName("ラップ")).toBe("楽ラップ");
    expect(buildRakutenAccountName("特定")).toBe("特定");
    expect(buildRakutenAccountId("  一般  ")).toBe("rakuten:一般");
    expect(buildRakutenAccountName("  一般  ")).toBe("一般");
  });

  it("normalizes account labels", () => {
    expect(buildRakutenAccountId("  特定  ")).toBe("rakuten:特定");
    expect(buildRakutenNameKey("Ａ　Ｂ")).toBeTruthy();
  });

  it("builds external id from name when ticker is missing", () => {
    expect(buildRakutenExternalId(null, "rakuten:特定", "")).toBe("account:rakuten:特定");
    expect(buildRakutenExternalId(undefined, "rakuten:ラップ", "現金等")).toMatch(/^n:/);
    expect(buildRakutenExternalId("1489", "rakuten:特定")).toBe("1489__rakuten:特定");
    expect(buildRakutenExternalId(null, "rakuten:特定")).toBe("account:rakuten:特定");
    expect(buildRakutenExternalId(null, "rakuten:一般", null)).toBe("account:rakuten:一般");
  });

  it("extracts ticker from external id variants", () => {
    expect(extractRakutenTickerFromExternalId(null)).toBeNull();
    expect(extractRakutenTickerFromExternalId("account:rakuten:特定")).toBeNull();
    expect(extractRakutenTickerFromExternalId("4826")).toBe("4826");
    expect(extractRakutenTickerFromExternalId("4826__rakuten:特定")).toBe("4826");
    expect(extractRakutenTickerFromExternalId("__rakuten:特定")).toBeNull();
  });
});
