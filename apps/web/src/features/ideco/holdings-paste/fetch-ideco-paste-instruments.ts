import { getApiBaseUrl } from "@/lib/api-base";

import type { IdecoPasteInstrumentDto } from "./types";

export async function fetchIdecoPasteInstruments(): Promise<
  { ok: true; data: IdecoPasteInstrumentDto[] } | { ok: false; status: number; message: string }
> {
  let result:
    | { ok: true; data: IdecoPasteInstrumentDto[] }
    | { ok: false; status: number; message: string } = {
    ok: false,
    status: 0,
    message: "リクエストに失敗しました。",
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}/portfolios/ideco/instruments-for-paste`);
    if (!response.ok) {
      result = {
        ok: false,
        status: response.status,
        message: `HTTP ${response.status}`,
      };
      return result;
    }

    const data = (await response.json()) as IdecoPasteInstrumentDto[];
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
