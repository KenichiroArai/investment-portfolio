import { describe, expect, it } from "vitest";

import {
  buildRakutenInstrumentMatchKeys,
  matchRakutenInstrumentId,
} from "../src/rakuten-instrument-match";

describe("rakuten-instrument-match", () => {
  it("builds match keys from instrument names", () => {
    expect(buildRakutenInstrumentMatchKeys("ＮＦ日経高配当５０").length).toBeGreaterThan(0);
  });

  it("returns null for empty instrument name", () => {
    expect(matchRakutenInstrumentId([], "  ")).toBeNull();
  });

  it("matches a single ticker candidate directly", () => {
    const id = matchRakutenInstrumentId(
      [{ id: "only", name: "Other", ticker: "1489", accountId: "rakuten:特定" }],
      "ＮＦ日経高配当５０",
      { ticker: "1489", accountId: "rakuten:特定" },
    );
    expect(id).toBe("only");
  });

  it("resolves ticker from external id when candidate ticker is missing", () => {
    const id = matchRakutenInstrumentId(
      [
        {
          id: "from-external",
          name: "ＣＩＪ",
          ticker: null,
          externalId: "4826__rakuten:特定",
          accountId: "rakuten:特定",
        },
      ],
      "ＣＩＪ",
      { ticker: "4826", accountId: "rakuten:特定" },
    );
    expect(id).toBe("from-external");
  });

  it("disambiguates multiple ticker matches by exact name", () => {
    const id = matchRakutenInstrumentId(
      [
        { id: "a", name: "Alpha", ticker: "4826", accountId: "rakuten:特定" },
        { id: "b", name: "ＣＩＪ", ticker: "4826", accountId: "rakuten:特定" },
      ],
      "ＣＩＪ",
      { ticker: "4826", accountId: "rakuten:特定" },
    );
    expect(id).toBe("b");
  });

  it("treats candidates without account id as out of account scope", () => {
    const id = matchRakutenInstrumentId(
      [{ id: "no-account", name: "現金等", ticker: null }],
      "現金等",
      { accountId: "rakuten:ラップ" },
    );
    expect(id).toBe("no-account");
  });

  it("falls back to global match when account scoped match fails", () => {
    const id = matchRakutenInstrumentId(
      [{ id: "global", name: "現金等", ticker: null, accountId: "rakuten:ラップ" }],
      "現金等",
      { accountId: "rakuten:一般" },
    );
    expect(id).toBe("global");
  });

  it("returns null when ticker candidates share a code but names differ", () => {
    const id = matchRakutenInstrumentId(
      [
        { id: "a", name: "Alpha", ticker: "1489", accountId: "rakuten:特定" },
        { id: "b", name: "Beta", ticker: "1489", accountId: "rakuten:特定" },
      ],
      "Gamma",
      { ticker: "1489", accountId: "rakuten:特定" },
    );
    expect(id).toBeNull();
  });
});
