import { getApiBaseUrl } from "@/lib/api-base";

import type { PasteInstrumentDto } from "./types";

export async function fetchPasteInstruments(
  portfolioCode: string,
): Promise<
  { ok: true; data: PasteInstrumentDto[] } | { ok: false; status: number; message: string }
> {
  let result:
    | { ok: true; data: PasteInstrumentDto[] }
    | { ok: false; status: number; message: string } = {
    ok: false,
    status: 0,
    message: "リクエストに失敗しました。",
  };

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/portfolios/${encodeURIComponent(portfolioCode)}/instruments-for-paste`,
    );
    if (!response.ok) {
      result = {
        ok: false,
        status: response.status,
        message: `HTTP ${response.status}`,
      };
      return result;
    }

    const data = (await response.json()) as PasteInstrumentDto[];
    result = { ok: true, data };
    return result;
  } catch {
    result = {
      ok: false,
      status: 0,
      message: "API に接続できません。",
    };
    return result;
  }
}
