import { describe, expect, it } from "vitest";

import { matchSbiWrapInstrumentId } from "../src/sbi-wrap-instrument-match";

describe("sbi-wrap-instrument-match", () => {
  it("returns null for empty instrument name", () => {
    expect(matchSbiWrapInstrumentId([], "  ")).toBeNull();
  });

  it("matches without account id across products", () => {
    const id = matchSbiWrapInstrumentId(
      [
        { id: "1", name: "（ラップ専用）ＳＢＩ・米国株式", accountId: "sbi-wrap:AI投資" },
        { id: "2", name: "（ラップ専用）ＳＢＩ・米国株式", accountId: "sbi-wrap:匠の運用" },
      ],
      "（ラップ専用）ＳＢＩ・米国株式",
    );
    expect(id).toBe("1");
  });

  it("returns null when match keys cannot be built", () => {
    expect(matchSbiWrapInstrumentId([{ id: "1", name: "A" }], "B")).toBeNull();
  });

  it("excludes candidates without account id from account scoped match", () => {
    expect(
      matchSbiWrapInstrumentId([{ id: "1", name: "現金" }], "現金", {
        accountId: "sbi-wrap:AI投資",
      }),
    ).toBeNull();
  });

  it("matches within account scope and returns null when unmatched", () => {
    expect(
      matchSbiWrapInstrumentId(
        [{ id: "1", name: "現金", accountId: "sbi-wrap:AI投資" }],
        "現金",
        { accountId: "sbi-wrap:AI投資" },
      ),
    ).toBe("1");

    expect(
      matchSbiWrapInstrumentId(
        [{ id: "1", name: "現金", accountId: "sbi-wrap:AI投資" }],
        "現金",
        { accountId: "sbi-wrap:レバナビ" },
      ),
    ).toBeNull();
  });
});
