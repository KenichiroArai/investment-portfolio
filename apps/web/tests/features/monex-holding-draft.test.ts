import { describe, expect, it } from "vitest";

import type { MonexHoldingDraftRow, PasteInstrumentDto } from "../../src/features/monex/bulk-import/types";
import {
  filterInstrumentsByQuery,
  findSimilarInstruments,
  listUnmatchedInstrumentCandidates,
  rematchDraftRows,
} from "../../src/features/monex/bulk-import/holding-draft";

function makeDraft(
  partial: Partial<MonexHoldingDraftRow> & {
    instrumentName: string;
    instrumentId: string | null;
  },
): MonexHoldingDraftRow {
  let result: MonexHoldingDraftRow = {
    source: "domestic",
    instrumentName: partial.instrumentName,
    accountId: "monex:特定:普通預り",
    accountName: "特定 / 普通預り",
    accountType: "特定",
    custodyType: "普通預り",
    unitPriceMinor: 1000,
    dividendOption: "再投資コース",
    quantity: 10,
    avgCostMinor: 1000,
    marketValueMinor: 1000,
    bookValueMinor: 1000,
    unrealizedGainMinor: 0,
    unrealizedGainRate: 0,
    draftId: "draft-1",
    instrumentId: partial.instrumentId,
    ...partial,
  };
  return result;
}

describe("monex holding-draft helpers", () => {
  it("lists unique unmatched candidates", () => {
    const drafts = [
      makeDraft({ instrumentName: "新規A", instrumentId: null, draftId: "1" }),
      makeDraft({ instrumentName: "新規A", instrumentId: null, draftId: "2" }),
      makeDraft({ instrumentName: "既存B", instrumentId: "id-b", draftId: "3" }),
    ];

    expect(listUnmatchedInstrumentCandidates(drafts)).toEqual([
      { instrumentName: "新規A", source: "domestic", ticker: null },
    ]);
  });

  it("rematches drafts after instruments are added", () => {
    const drafts = [makeDraft({ instrumentName: "新規A", instrumentId: null })];
    const instruments: PasteInstrumentDto[] = [{ id: "new-id", name: "新規A", ticker: null }];

    expect(rematchDraftRows(drafts, instruments)[0].instrumentId).toBe("new-id");
  });

  it("filters and finds similar instruments", () => {
    const instruments: PasteInstrumentDto[] = [
      { id: "1", name: "ｅＭＡＸＩＳ　Ｓｌｉｍ　新興国株式インデックス", ticker: null },
      { id: "2", name: "ＧＳ　日本株・プラス（通貨分散コース）", ticker: null },
    ];

    expect(filterInstrumentsByQuery(instruments, "Ｓｌｉｍ")).toHaveLength(1);
    expect(findSimilarInstruments(instruments, "ＧＳ　日本株").map((item) => item.id)).toEqual([
      "2",
    ]);
  });
});
