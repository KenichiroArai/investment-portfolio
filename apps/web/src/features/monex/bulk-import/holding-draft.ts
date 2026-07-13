import {
  buildMonexHoldingMetrics,
  matchMonexInstrumentId,
  resolveMonexInstrumentAssetClassBreakdown,
  type HoldingLineInput,
  type MonexHoldingPasteRow,
  type MonexInstrumentAssetClassBreakdownEntry,
} from "@repo/shared";

import type { MonexHoldingDraftRow, PasteInstrumentDto } from "./types";

export function createHoldingDraftId(): string {
  let result = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return result;
}

function additionalMatchNamesForRow(row: MonexHoldingPasteRow): string[] {
  let result: string[] = [];

  if (row.source === "us") {
    result = [`${row.instrumentName}（${row.ticker}）`, row.ticker];
  }

  return result;
}

export function pasteRowsToDrafts(
  rows: MonexHoldingPasteRow[],
  instruments: PasteInstrumentDto[],
): MonexHoldingDraftRow[] {
  let result: MonexHoldingDraftRow[] = [];

  for (const row of rows) {
    const instrumentId = matchMonexInstrumentId(
      instruments,
      row.instrumentName,
      additionalMatchNamesForRow(row),
    );
    result.push({
      ...row,
      draftId: createHoldingDraftId(),
      instrumentId,
    });
  }

  return result;
}

export function draftRowsToHoldingInputs(drafts: MonexHoldingDraftRow[]): HoldingLineInput[] {
  let result: HoldingLineInput[] = [];

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    if (!draft.instrumentId) {
      continue;
    }

    const unitPriceMinor = draft.source === "us" ? draft.avgCostMinor : draft.unitPriceMinor;
    const dividendOption = draft.source === "us" ? "" : draft.dividendOption;

    result.push({
      instrumentId: draft.instrumentId,
      accountId: draft.accountId,
      accountName: draft.accountName,
      quantity: draft.quantity,
      marketValueMinor: draft.marketValueMinor,
      bookValueMinor: draft.bookValueMinor,
      sortOrder: index + 1,
      metrics: buildMonexHoldingMetrics({
        unitPriceMinor,
        avgCostMinor: draft.avgCostMinor,
        accountType: draft.accountType,
        custodyType: draft.custodyType,
        dividendOption,
        unrealizedGainMinor: draft.unrealizedGainMinor,
        unrealizedGainRate: draft.unrealizedGainRate,
      }),
    });
  }

  return result;
}

export function hasUnmatchedDraftRows(drafts: MonexHoldingDraftRow[]): boolean {
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
  drafts: MonexHoldingDraftRow[],
  index: number,
  updated: MonexHoldingDraftRow,
): MonexHoldingDraftRow[] {
  let result = drafts.map((draft, draftIndex) => {
    if (draftIndex === index) {
      return updated;
    }
    return draft;
  });
  return result;
}

export function removeDraftRowAtIndex(
  drafts: MonexHoldingDraftRow[],
  index: number,
): MonexHoldingDraftRow[] {
  let result = drafts.filter((_, draftIndex) => draftIndex !== index);
  return result;
}

export function buildAssetClassAssignments(
  drafts: MonexHoldingDraftRow[],
  breakdownByInstrumentName: Map<string, MonexInstrumentAssetClassBreakdownEntry[]>,
): Array<{
  instrumentId: string;
  weights: Array<{ valueCode: string; allocationWeight: number }>;
}> {
  let result: Array<{
    instrumentId: string;
    weights: Array<{ valueCode: string; allocationWeight: number }>;
  }> = [];
  const seenInstrumentIds = new Set<string>();

  for (const draft of drafts) {
    if (!draft.instrumentId || seenInstrumentIds.has(draft.instrumentId)) {
      continue;
    }

    const additionalNames = additionalMatchNamesForRow(draft);
    let breakdown = resolveMonexInstrumentAssetClassBreakdown(
      breakdownByInstrumentName,
      draft.instrumentName,
      additionalNames,
    );

    if (breakdown.length === 0) {
      for (const [name, entries] of breakdownByInstrumentName) {
        const matched = matchMonexInstrumentId(
          [{ id: draft.instrumentId, name: draft.instrumentName }],
          name,
          additionalNames,
        );
        if (matched) {
          breakdown = entries;
          break;
        }
      }
    }

    if (breakdown.length === 0) {
      continue;
    }

    seenInstrumentIds.add(draft.instrumentId);
    result.push({
      instrumentId: draft.instrumentId,
      weights: breakdown.map((entry) => ({
        valueCode: entry.valueCode,
        allocationWeight: entry.allocationWeight,
      })),
    });
  }

  return result;
}

export function sourceLabel(source: MonexHoldingPasteRow["source"]): string {
  let result = "国内株等";

  if (source === "us") {
    result = "米国株";
    return result;
  }

  if (source === "compass") {
    result = "ON COMPASS";
    return result;
  }

  return result;
}
