import {
  matchSbiWrapInstrumentId,
  normalizeIdecoInstrumentMatchKey,
  type HoldingLineInput,
  type SbiWrapHoldingPasteRow,
} from "@repo/shared";

import type { PasteInstrumentDto, SbiWrapHoldingDraftRow } from "./types";

export function createHoldingDraftId(): string {
  let result = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return result;
}

export function pasteRowsToDrafts(
  rows: SbiWrapHoldingPasteRow[],
  instruments: PasteInstrumentDto[],
): SbiWrapHoldingDraftRow[] {
  let result: SbiWrapHoldingDraftRow[] = [];

  for (const row of rows) {
    const instrumentId = matchSbiWrapInstrumentId(instruments, row.instrumentName, {
      accountId: row.accountId,
    });
    result.push({
      ...row,
      draftId: createHoldingDraftId(),
      instrumentId,
    });
  }

  return result;
}

export function draftRowsToHoldingInputs(drafts: SbiWrapHoldingDraftRow[]): HoldingLineInput[] {
  let result: HoldingLineInput[] = [];

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    if (!draft.instrumentId) {
      continue;
    }

    result.push({
      instrumentId: draft.instrumentId,
      accountId: draft.accountId,
      accountName: draft.accountName,
      quantity: draft.quantity,
      marketValueMinor: draft.marketValueMinor,
      bookValueMinor: draft.bookValueMinor,
      sortOrder: index + 1,
      metrics: [
        {
          code: "account_type",
          textValue: draft.accountType,
        },
      ],
    });
  }

  return result;
}

export function hasUnmatchedDraftRows(drafts: SbiWrapHoldingDraftRow[]): boolean {
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
  drafts: SbiWrapHoldingDraftRow[],
  index: number,
  updated: SbiWrapHoldingDraftRow,
): SbiWrapHoldingDraftRow[] {
  let result = drafts.map((draft, draftIndex) => {
    if (draftIndex === index) {
      return updated;
    }
    return draft;
  });
  return result;
}

export function removeDraftRowAtIndex(
  drafts: SbiWrapHoldingDraftRow[],
  index: number,
): SbiWrapHoldingDraftRow[] {
  let result = drafts.filter((_, draftIndex) => draftIndex !== index);
  return result;
}

export function sourceLabel(source: SbiWrapHoldingPasteRow["source"]): string {
  let result = "その他";

  if (source === "wrap_fund") {
    result = "ファンド";
    return result;
  }
  if (source === "wrap_cash") {
    result = "現金";
  }

  return result;
}

export type UnmatchedInstrumentCandidate = {
  instrumentName: string;
  source: SbiWrapHoldingPasteRow["source"];
  productCode: SbiWrapHoldingPasteRow["productCode"];
  productName: string;
  accountId: string;
  accountName: string;
};

export function listUnmatchedInstrumentCandidates(
  drafts: SbiWrapHoldingDraftRow[],
): UnmatchedInstrumentCandidate[] {
  let result: UnmatchedInstrumentCandidate[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    if (draft.instrumentId) {
      continue;
    }
    const key = `${draft.instrumentName}:${draft.accountId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      instrumentName: draft.instrumentName,
      source: draft.source,
      productCode: draft.productCode,
      productName: draft.productName,
      accountId: draft.accountId,
      accountName: draft.accountName,
    });
  }

  return result;
}

export function rematchDraftRows(
  drafts: SbiWrapHoldingDraftRow[],
  instruments: PasteInstrumentDto[],
): SbiWrapHoldingDraftRow[] {
  let result: SbiWrapHoldingDraftRow[] = [];

  for (const draft of drafts) {
    const matchedId = matchSbiWrapInstrumentId(instruments, draft.instrumentName, {
      accountId: draft.accountId,
    });
    if (matchedId) {
      result.push({
        ...draft,
        instrumentId: matchedId,
      });
      continue;
    }

    // 手動選択は同一商品（accountId）内の銘柄だけ残す。他商品の「現金」などは外す。
    if (draft.instrumentId) {
      const selected = instruments.find((instrument) => instrument.id === draft.instrumentId);
      if (selected && selected.accountId === draft.accountId) {
        result.push(draft);
        continue;
      }
    }

    result.push({
      ...draft,
      instrumentId: null,
    });
  }

  return result;
}

export function filterInstrumentsByQuery(
  instruments: PasteInstrumentDto[],
  query: string,
): PasteInstrumentDto[] {
  let result: PasteInstrumentDto[] = [];
  const normalizedQuery = normalizeIdecoInstrumentMatchKey(query);

  if (normalizedQuery === "") {
    result = [...instruments];
    return result;
  }

  for (const instrument of instruments) {
    const nameKey = normalizeIdecoInstrumentMatchKey(instrument.name);
    const accountKey = normalizeIdecoInstrumentMatchKey(instrument.accountId);
    if (nameKey.includes(normalizedQuery) || accountKey.includes(normalizedQuery)) {
      result.push(instrument);
    }
  }

  return result;
}

export function findSimilarInstruments(
  instruments: PasteInstrumentDto[],
  instrumentName: string,
  limit = 5,
): PasteInstrumentDto[] {
  let result: PasteInstrumentDto[] = [];
  const pasteKey = normalizeIdecoInstrumentMatchKey(instrumentName);
  if (pasteKey === "") {
    return result;
  }

  const scored: Array<{ instrument: PasteInstrumentDto; score: number }> = [];
  for (const instrument of instruments) {
    const nameKey = normalizeIdecoInstrumentMatchKey(instrument.name);
    if (nameKey === "") {
      continue;
    }

    let score = 0;
    if (nameKey === pasteKey) {
      score = 1000;
    } else if (nameKey.startsWith(pasteKey) || pasteKey.startsWith(nameKey)) {
      score = Math.min(nameKey.length, pasteKey.length);
    } else {
      const prefixLength = Math.min(8, pasteKey.length, nameKey.length);
      for (let size = prefixLength; size >= 3; size -= 1) {
        if (nameKey.includes(pasteKey.slice(0, size))) {
          score = size;
          break;
        }
      }
    }

    if (score > 0) {
      scored.push({ instrument, score });
    }
  }

  scored.sort((left, right) => right.score - left.score);
  result = scored.slice(0, limit).map((item) => item.instrument);
  return result;
}

export function resolveInstrumentTypeForSource(
  source: SbiWrapHoldingPasteRow["source"],
): string {
  let result = "mutual_fund";

  if (source === "wrap_cash") {
    result = "cash";
  }

  return result;
}
