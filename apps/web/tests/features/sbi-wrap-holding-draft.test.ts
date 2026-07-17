import { describe, expect, it } from "vitest";

import type { SbiWrapHoldingPasteRow } from "@repo/shared";

import {
  draftRowsToHoldingInputs,
  hasUnmatchedDraftRows,
  listUnmatchedInstrumentCandidates,
  pasteRowsToDrafts,
  rematchDraftRows,
  resolveInstrumentTypeForSource,
} from "../../src/features/sbi-wrap/bulk-import/holding-draft";
import type { PasteInstrumentDto } from "../../src/features/sbi-wrap/bulk-import/types";

const sampleRow: SbiWrapHoldingPasteRow = {
  source: "wrap_fund",
  productCode: "ai_investment",
  productName: "AI投資",
  instrumentName: "（ラップ専用）ＳＢＩ・米国株式",
  accountId: "sbi-wrap:AI投資",
  accountName: "AI投資",
  accountType: "AI投資",
  quantity: 1,
  marketValueMinor: 1617,
  bookValueMinor: null,
  weight: 0.16,
};

const cashAi: SbiWrapHoldingPasteRow = {
  source: "wrap_cash",
  productCode: "ai_investment",
  productName: "AI投資",
  instrumentName: "現金",
  accountId: "sbi-wrap:AI投資",
  accountName: "AI投資",
  accountType: "AI投資",
  quantity: 1,
  marketValueMinor: 208,
  bookValueMinor: null,
  weight: 0.021,
};

const cashTakumi: SbiWrapHoldingPasteRow = {
  source: "wrap_cash",
  productCode: "takumi",
  productName: "匠の運用",
  instrumentName: "現金",
  accountId: "sbi-wrap:匠の運用",
  accountName: "匠の運用",
  accountType: "匠の運用",
  quantity: 1,
  marketValueMinor: 107,
  bookValueMinor: null,
  weight: 0.011,
};

describe("sbi-wrap holding-draft", () => {
  it("matches paste rows by name and accountId", () => {
    const instruments: PasteInstrumentDto[] = [
      {
        id: "inst-1",
        name: "（ラップ専用）ＳＢＩ・米国株式",
        accountId: "sbi-wrap:AI投資",
      },
    ];

    const drafts = pasteRowsToDrafts([sampleRow], instruments);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].instrumentId).toBe("inst-1");
    expect(hasUnmatchedDraftRows(drafts)).toBe(false);

    const lines = draftRowsToHoldingInputs(drafts);
    expect(lines).toEqual([
      {
        instrumentId: "inst-1",
        accountId: "sbi-wrap:AI投資",
        accountName: "AI投資",
        quantity: 1,
        marketValueMinor: 1617,
        bookValueMinor: null,
        sortOrder: 1,
        metrics: [{ code: "account_type", textValue: "AI投資" }],
      },
    ]);
  });

  it("lists unmatched candidates and resolves instrument types", () => {
    const drafts = pasteRowsToDrafts([sampleRow], []);
    expect(hasUnmatchedDraftRows(drafts)).toBe(true);
    expect(listUnmatchedInstrumentCandidates(drafts)).toEqual([
      {
        instrumentName: "（ラップ専用）ＳＢＩ・米国株式",
        source: "wrap_fund",
        productCode: "ai_investment",
        productName: "AI投資",
        accountId: "sbi-wrap:AI投資",
        accountName: "AI投資",
      },
    ]);
    expect(resolveInstrumentTypeForSource("wrap_fund")).toBe("mutual_fund");
    expect(resolveInstrumentTypeForSource("wrap_cash")).toBe("cash");
  });

  it("keeps cash unmatched per product until each account has its own instrument", () => {
    const drafts = pasteRowsToDrafts([cashAi, cashTakumi], [
      {
        id: "cash-ai",
        name: "現金",
        accountId: "sbi-wrap:AI投資",
      },
    ]);

    expect(drafts[0].instrumentId).toBe("cash-ai");
    expect(drafts[1].instrumentId).toBeNull();
    expect(listUnmatchedInstrumentCandidates(drafts)).toEqual([
      {
        instrumentName: "現金",
        source: "wrap_cash",
        productCode: "takumi",
        productName: "匠の運用",
        accountId: "sbi-wrap:匠の運用",
        accountName: "匠の運用",
      },
    ]);

    const rematched = rematchDraftRows(drafts, [
      {
        id: "cash-ai",
        name: "現金",
        accountId: "sbi-wrap:AI投資",
      },
      {
        id: "cash-takumi",
        name: "現金",
        accountId: "sbi-wrap:匠の運用",
      },
    ]);
    expect(rematched[0].instrumentId).toBe("cash-ai");
    expect(rematched[1].instrumentId).toBe("cash-takumi");
  });
});
