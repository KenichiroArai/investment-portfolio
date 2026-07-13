import type { MonexHoldingPasteRow } from "@repo/shared";

export type PasteInstrumentDto = {
  id: string;
  name: string;
  ticker: string | null;
};

export type MonexHoldingDraftRow = MonexHoldingPasteRow & {
  draftId: string;
  instrumentId: string | null;
};
