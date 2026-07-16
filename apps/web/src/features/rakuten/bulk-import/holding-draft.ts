import {
  buildRakutenHoldingMetrics,
  matchRakutenInstrumentId,
  normalizeIdecoInstrumentMatchKey,
  type HoldingLineInput,
  type RakutenHoldingPasteRow,
} from "@repo/shared";

import type { PasteInstrumentDto, RakutenHoldingDraftRow } from "./types";

export function createHoldingDraftId(): string {
  let result = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return result;
}

export function pasteRowsToDrafts(
  rows: RakutenHoldingPasteRow[],
  instruments: PasteInstrumentDto[],
): RakutenHoldingDraftRow[] {
  let result: RakutenHoldingDraftRow[] = [];

  for (const row of rows) {
    const instrumentId = matchRakutenInstrumentId(instruments, row.instrumentName, {
      ticker: row.ticker,
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

export function draftRowsToHoldingInputs(drafts: RakutenHoldingDraftRow[]): HoldingLineInput[] {
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
      metrics: buildRakutenHoldingMetrics({
        unitPriceMinor: draft.unitPriceMinor,
        avgCostMinor: draft.avgCostMinor,
        accountType: draft.accountType,
        unrealizedGainMinor: draft.unrealizedGainMinor,
        unrealizedGainRate: draft.unrealizedGainRate,
      }),
    });
  }

  return result;
}

export function hasUnmatchedDraftRows(drafts: RakutenHoldingDraftRow[]): boolean {
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
  drafts: RakutenHoldingDraftRow[],
  index: number,
  updated: RakutenHoldingDraftRow,
): RakutenHoldingDraftRow[] {
  let result = drafts.map((draft, draftIndex) => {
    if (draftIndex === index) {
      return updated;
    }
    return draft;
  });
  return result;
}

export function removeDraftRowAtIndex(
  drafts: RakutenHoldingDraftRow[],
  index: number,
): RakutenHoldingDraftRow[] {
  let result = drafts.filter((_, draftIndex) => draftIndex !== index);
  return result;
}

export function sourceLabel(source: RakutenHoldingPasteRow["source"]): string {
  let result = "その他";

  if (source === "domestic_equity") {
    result = "国内株式";
    return result;
  }
  if (source === "mutual_fund") {
    result = "投資信託";
    return result;
  }
  if (source === "money_fund") {
    result = "マネーファンド";
    return result;
  }
  if (source === "fx_mmf") {
    result = "外貨建MMF";
    return result;
  }
  if (source === "domestic_bond") {
    result = "国内債券";
    return result;
  }
  if (source === "wrap_fund") {
    result = "楽ラップ";
    return result;
  }
  if (source === "wrap_cash") {
    result = "現金等";
    return result;
  }

  return result;
}

export type UnmatchedInstrumentCandidate = {
  instrumentName: string;
  source: RakutenHoldingPasteRow["source"];
  ticker: string | null;
  accountId: string;
  accountName: string;
};

export function listUnmatchedInstrumentCandidates(
  drafts: RakutenHoldingDraftRow[],
): UnmatchedInstrumentCandidate[] {
  let result: UnmatchedInstrumentCandidate[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    if (draft.instrumentId) {
      continue;
    }
    const key = `${draft.ticker ?? ""}:${draft.instrumentName}:${draft.accountId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      instrumentName: draft.instrumentName,
      source: draft.source,
      ticker: draft.ticker,
      accountId: draft.accountId,
      accountName: draft.accountName,
    });
  }

  return result;
}

export function rematchDraftRows(
  drafts: RakutenHoldingDraftRow[],
  instruments: PasteInstrumentDto[],
): RakutenHoldingDraftRow[] {
  let result: RakutenHoldingDraftRow[] = [];

  for (const draft of drafts) {
    const instrumentId = matchRakutenInstrumentId(instruments, draft.instrumentName, {
      ticker: draft.ticker,
      accountId: draft.accountId,
    });
    result.push({
      ...draft,
      instrumentId: instrumentId ?? draft.instrumentId,
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
    const tickerKey = instrument.ticker
      ? normalizeIdecoInstrumentMatchKey(instrument.ticker)
      : "";
    if (
      nameKey.includes(normalizedQuery) ||
      tickerKey.includes(normalizedQuery) ||
      normalizedQuery.includes(nameKey)
    ) {
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
  source: RakutenHoldingPasteRow["source"],
): string {
  let result = "mutual_fund";

  if (source === "domestic_equity") {
    result = "equity";
    return result;
  }
  if (source === "domestic_bond") {
    result = "bond";
    return result;
  }
  if (source === "wrap_cash") {
    result = "cash";
    return result;
  }

  return result;
}
