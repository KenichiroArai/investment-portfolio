import { vi } from "vitest";

export const MANAGE_INSTRUMENT = {
  id: "i1",
  portfolioId: "p1",
  accountId: "ideco:manual",
  name: "テスト銘柄",
  instrumentType: "fund",
  currency: "JPY",
  externalId: null,
};

export const MANAGE_SNAPSHOT = {
  id: "snap1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [],
  metrics: [
    {
      code: "ideco_total_contributions",
      integerValue: 500_000,
      realValue: null,
      textValue: null,
    },
  ],
  lines: [
    {
      id: "l1",
      instrumentId: "i1",
      instrumentName: "テスト銘柄",
      accountId: "ideco:unknown",
      accountName: "不明口座",
      sortOrder: 0,
      quantity: 10,
      marketValueMinor: 100_000,
      bookValueMinor: 80_000,
      metrics: [],
      instrumentAttributes: [],
      tags: [],
    },
  ],
};

export const MANAGE_SCHEME = {
  id: "sch1",
  code: "region",
  name: "地域",
  values: [{ id: "v1", code: "japan", name: "日本", sortOrder: 0 }],
};

type ManageFetchMockOptions = {
  snapshot?: typeof MANAGE_SNAPSHOT | null;
  instruments?: typeof MANAGE_INSTRUMENT[];
  schemes?: typeof MANAGE_SCHEME[];
  snapshotGetStatus?: number;
  schemesGetStatus?: number;
  failFetch?: boolean;
  mutate?: {
    createInstrument?: { ok: boolean; status?: number; message?: string };
    setClassifications?: { ok: boolean; status?: number; message?: string };
    replaceSnapshot?: { ok: boolean; status?: number; message?: string };
    updateInstrument?: { ok: boolean; status?: number; message?: string };
    deleteInstrument?: { ok: boolean; status?: number; message?: string };
    createScheme?: { ok: boolean; status?: number; message?: string };
    updateScheme?: { ok: boolean; status?: number; message?: string };
    deleteScheme?: { ok: boolean; status?: number; message?: string };
    createValue?: { ok: boolean; status?: number; message?: string };
    updateValue?: { ok: boolean; status?: number; message?: string };
    deleteValue?: { ok: boolean; status?: number; message?: string };
    instrumentClassifications?: { ok: boolean; status?: number; message?: string };
    setInstrumentTags?: { ok: boolean; status?: number; message?: string };
    createPortfolio?: { ok: boolean; status?: number; message?: string };
    updatePortfolio?: { ok: boolean; status?: number; message?: string };
    deletePortfolio?: { ok: boolean; status?: number; message?: string };
  };
};

function errorResponse(status: number, message: string) {
  let result = {
    ok: false,
    status,
    json: async () => ({ error: message }),
  };
  return result;
}

function okResponse(body: unknown, status = 200) {
  let result = {
    ok: true,
    status,
    json: async () => body,
  };
  return result;
}

export function createManageFetchMock(options: ManageFetchMockOptions = {}) {
  const state = {
    snapshot:
      options.snapshot === undefined ? MANAGE_SNAPSHOT : options.snapshot,
    instruments: options.instruments ?? [MANAGE_INSTRUMENT],
    schemes: options.schemes ?? [MANAGE_SCHEME],
  };

  let result = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (options.failFetch) {
      throw new Error("network");
    }

    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes("/snapshot/current") && method === "GET") {
      const status = options.snapshotGetStatus ?? 200;
      if (status === 404 || state.snapshot === null) {
        return errorResponse(404, "not found");
      }
      if (status !== 200) {
        return errorResponse(status, "snapshot error");
      }
      return okResponse(state.snapshot);
    }

    if (url.includes("/snapshot/current") && method === "PUT") {
      const mutate = options.mutate?.replaceSnapshot;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "save failed");
      }
      const body = JSON.parse(String(init?.body)) as typeof MANAGE_SNAPSHOT;
      state.snapshot = {
        ...MANAGE_SNAPSHOT,
        ...body,
        id: MANAGE_SNAPSHOT.id,
        portfolioCode: MANAGE_SNAPSHOT.portfolioCode,
        portfolioName: MANAGE_SNAPSHOT.portfolioName,
        analysisSchemes: MANAGE_SNAPSHOT.analysisSchemes,
        lines: body.lines.map((line, index) => ({
          id: `l${index + 1}`,
          instrumentId: line.instrumentId,
          instrumentName:
            state.instruments.find((item) => item.id === line.instrumentId)?.name ??
            "銘柄",
          sortOrder: line.sortOrder ?? index,
          quantity: line.quantity,
          marketValueMinor: line.marketValueMinor,
          bookValueMinor: line.bookValueMinor ?? null,
          metrics: [],
          instrumentAttributes: [],
          tags: [],
        })),
      };
      return okResponse(state.snapshot);
    }

    if (
      (url.endsWith("/instruments") || url.includes("/instruments?")) &&
      !url.includes("/instruments-for-paste") &&
      method === "GET"
    ) {
      return okResponse(state.instruments);
    }

    if (url.includes("/instruments-for-paste") && method === "GET") {
      return okResponse(
        state.instruments.map((item) => ({
          id: item.id,
          name: item.name,
          shortName: null,
        })),
      );
    }

    if (url.endsWith("/instruments") && method === "POST") {
      const mutate = options.mutate?.createInstrument;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "create failed");
      }
      const body = JSON.parse(String(init?.body)) as { name: string };
      const created = { ...MANAGE_INSTRUMENT, id: "i-new", name: body.name };
      state.instruments = [...state.instruments, created];
      return okResponse(created);
    }

    if (url.includes("/instruments/") && url.includes("/classifications") && method === "GET") {
      const mutate = options.mutate?.instrumentClassifications;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 500, mutate.message ?? "tags failed");
      }
      return okResponse({ classificationValueIds: ["v1"] });
    }

    if (url.includes("/instruments/") && url.includes("/classifications") && method === "PUT") {
      const mutate = options.mutate?.setClassifications ?? options.mutate?.setInstrumentTags;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "tags save failed");
      }
      return okResponse({ ok: true });
    }

    if (/instruments\/[^/]+$/.test(url) && method === "PUT") {
      const mutate = options.mutate?.updateInstrument;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "update failed");
      }
      const body = JSON.parse(String(init?.body)) as { name: string };
      state.instruments = state.instruments.map((item) =>
        url.includes(item.id) ? { ...item, name: body.name } : item,
      );
      return okResponse({ ...MANAGE_INSTRUMENT, name: body.name });
    }

    if (/instruments\/[^/]+$/.test(url) && method === "DELETE") {
      const mutate = options.mutate?.deleteInstrument;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "delete failed");
      }
      return okResponse({ ok: true });
    }

    if (url.includes("/classification-schemes") && method === "GET") {
      const status = options.schemesGetStatus ?? 200;
      if (status !== 200) {
        return errorResponse(status, "scheme error");
      }
      return okResponse(state.schemes);
    }

    if (url.includes("/portfolios/ideco/classification-schemes") && method === "POST") {
      const mutate = options.mutate?.createScheme;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "scheme create failed");
      }
      const body = JSON.parse(String(init?.body)) as { code: string; name: string };
      const created = { id: "sch-new", ...body, values: [] as typeof MANAGE_SCHEME.values };
      state.schemes = [...state.schemes, created];
      return okResponse(created);
    }

    if (url.includes("/classification-schemes/") && method === "PUT") {
      const mutate = options.mutate?.updateScheme;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "scheme update failed");
      }
      const body = JSON.parse(String(init?.body)) as { name: string };
      return okResponse({ ...MANAGE_SCHEME, name: body.name });
    }

    if (url.includes("/classification-schemes/") && method === "DELETE") {
      const mutate = options.mutate?.deleteScheme;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "scheme delete failed");
      }
      return okResponse({ ok: true });
    }

    if (url.includes("/classification-schemes/") && url.endsWith("/values") && method === "POST") {
      const mutate = options.mutate?.createValue;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "value create failed");
      }
      const body = JSON.parse(String(init?.body)) as {
        code: string;
        name: string;
        sortOrder: number;
      };
      return okResponse({
        id: "v-new",
        code: body.code,
        name: body.name,
        sortOrder: body.sortOrder,
      });
    }

    if (url.includes("/classification-values/") && method === "PUT") {
      const mutate = options.mutate?.updateValue;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "value update failed");
      }
      const body = JSON.parse(String(init?.body)) as { name: string; sortOrder: number };
      return okResponse({
        id: "v1",
        code: "japan",
        name: body.name,
        sortOrder: body.sortOrder,
      });
    }

    if (url.includes("/classification-values/") && method === "DELETE") {
      const mutate = options.mutate?.deleteValue;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "value delete failed");
      }
      return okResponse({ ok: true });
    }

    if (url.endsWith("/portfolios") && method === "GET") {
      return okResponse([
        {
          id: "p1",
          code: "ideco",
          name: "iDeCo",
          kind: "ideco",
        },
      ]);
    }

    if (url.endsWith("/portfolios") && method === "POST") {
      const mutate = options.mutate?.createPortfolio;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "portfolio create failed");
      }
      const body = JSON.parse(String(init?.body)) as {
        code: string;
        name: string;
        kind: string;
      };
      return okResponse({
        id: "p-new",
        code: body.code,
        name: body.name,
        kind: body.kind,
      });
    }

    if (/portfolios\/[^/]+$/.test(url) && method === "PUT") {
      const mutate = options.mutate?.updatePortfolio;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "portfolio update failed");
      }
      const body = JSON.parse(String(init?.body)) as { name: string; kind: string };
      return okResponse({
        id: "p1",
        code: "ideco",
        name: body.name,
        kind: body.kind,
      });
    }

    if (/portfolios\/[^/]+$/.test(url) && method === "DELETE") {
      const mutate = options.mutate?.deletePortfolio;
      if (mutate && !mutate.ok) {
        return errorResponse(mutate.status ?? 400, mutate.message ?? "portfolio delete failed");
      }
      return okResponse({ ok: true });
    }

    return okResponse({});
  });

  return result;
}
