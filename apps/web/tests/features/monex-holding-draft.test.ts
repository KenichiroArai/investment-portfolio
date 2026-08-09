import { describe, expect, it } from "vitest";

import type { MonexInstrumentAssetClassBreakdownEntry } from "@repo/shared";

import type { MonexHoldingDraftRow, PasteInstrumentDto } from "../../src/features/monex/bulk-import/types";
import {
  buildAssetClassAssignments,
  filterInstrumentsByQuery,
  findSimilarInstruments,
  listUnmatchedAssetClassInstrumentNames,
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

  it("assigns MSV multi-class weights via alias map", () => {
    const drafts = [
      makeDraft({
        source: "compass",
        instrumentName: "ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ",
        instrumentId: "msv-id",
        dividendOption: "受取",
      }),
    ];
    const breakdown = new Map<string, MonexInstrumentAssetClassBreakdownEntry[]>([
      [
        "ＭＳＶ内外ＥＴＦ資産配分Ｆ・Ｇ",
        [
          { valueCode: "developed_equity", allocationWeight: 0.63 },
          { valueCode: "developed_bond", allocationWeight: 0.37 },
        ],
      ],
    ]);

    const assignments = buildAssetClassAssignments(drafts, breakdown);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].instrumentId).toBe("msv-id");
    expect(assignments[0].weights).toHaveLength(2);
    expect(listUnmatchedAssetClassInstrumentNames(drafts, breakdown)).toEqual([]);
  });

  it("lists asset-class names that do not match any draft", () => {
    const drafts = [
      makeDraft({
        instrumentName: "ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）",
        instrumentId: "eq-id",
      }),
    ];
    const breakdown = new Map<string, MonexInstrumentAssetClassBreakdownEntry[]>([
      [
        "ｅＭＡＸＩＳ　Ｓｌｉｍ　国内株式（ＴＯＰＩＸ）",
        [{ valueCode: "domestic_equity", allocationWeight: 1 }],
      ],
      ["お預り金またはMRF", [{ valueCode: "short_term", allocationWeight: 1 }]],
    ]);

    expect(listUnmatchedAssetClassInstrumentNames(drafts, breakdown)).toEqual([
      "お預り金またはMRF",
    ]);
  });
});
