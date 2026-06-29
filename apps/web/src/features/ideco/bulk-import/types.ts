import type { IdecoHoldingsPasteRow } from "@repo/shared";

export type PasteInstrumentDto = {
  id: string;
  name: string;
  shortName: string | null;
};

export type IdecoHoldingDraftRow = IdecoHoldingsPasteRow & {
  draftId: string;
  instrumentId: string | null;
};
