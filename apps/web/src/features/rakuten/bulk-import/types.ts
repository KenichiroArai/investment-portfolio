import type { RakutenHoldingPasteRow } from "@repo/shared";

export type PasteInstrumentDto = {
  id: string;
  name: string;
  ticker: string | null;
  accountId: string;
};

export type RakutenHoldingDraftRow = RakutenHoldingPasteRow & {
  draftId: string;
  instrumentId: string | null;
};
