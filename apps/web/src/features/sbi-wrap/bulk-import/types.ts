import type { SbiWrapHoldingPasteRow } from "@repo/shared";

export type PasteInstrumentDto = {
  id: string;
  name: string;
  accountId: string;
};

export type SbiWrapHoldingDraftRow = SbiWrapHoldingPasteRow & {
  draftId: string;
  instrumentId: string | null;
};
