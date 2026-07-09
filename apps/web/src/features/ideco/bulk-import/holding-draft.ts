import {
  buildIdecoKakeiboMetrics,
  matchIdecoInstrumentId,
  type HoldingLineInput,
  type IdecoHoldingsPasteRow,
} from "@repo/shared";

import type { IdecoHoldingDraftRow, PasteInstrumentDto } from "./types";

export function createHoldingDraftId(): string {
  let result = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return result;
}

export function pasteRowsToDrafts(
  rows: IdecoHoldingsPasteRow[],
  instruments: PasteInstrumentDto[],
): IdecoHoldingDraftRow[] {
  let result: IdecoHoldingDraftRow[] = [];

  for (const row of rows) {
    const instrumentId = matchIdecoInstrumentId(instruments, row.instrumentName);
    result.push({
      ...row,
      draftId: createHoldingDraftId(),
      instrumentId,
    });
  }

  return result;
}

export function draftRowsToHoldingInputs(drafts: IdecoHoldingDraftRow[]): HoldingLineInput[] {
  let result: HoldingLineInput[] = [];

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    if (!draft.instrumentId) {
      continue;
    }

    result.push({
      instrumentId: draft.instrumentId,
      accountId: "ideco:default",
      accountName: "iDeCo",
      quantity: draft.quantity,
      marketValueMinor: draft.marketValueMinor,
      bookValueMinor: draft.bookValueMinor,
      sortOrder: index + 1,
      metrics: buildIdecoKakeiboMetrics({
        unitPricePerTenThousandLots: draft.unitPricePerTenThousandLots,
        unrealizedGainMinor: draft.unrealizedGainMinor,
        unrealizedGainRate: draft.unrealizedGainRate,
      }),
    });
  }

  return result;
}

export function hasUnmatchedDraftRows(drafts: IdecoHoldingDraftRow[]): boolean {
  let result = false;

  for (const draft of drafts) {
    if (!draft.instrumentId) {
      result = true;
      return result;
    }
  }

  return result;
}

export function updateDraftRowAtIndex(
  drafts: IdecoHoldingDraftRow[],
  index: number,
  updated: IdecoHoldingDraftRow,
): IdecoHoldingDraftRow[] {
  let result = drafts.map((draft, draftIndex) => {
    if (draftIndex === index) {
      return updated;
    }
    return draft;
  });
  return result;
}

export function removeDraftRowAtIndex(
  drafts: IdecoHoldingDraftRow[],
  index: number,
): IdecoHoldingDraftRow[] {
  let result = drafts.filter((_, draftIndex) => draftIndex !== index);
  return result;
}
