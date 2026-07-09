import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createClassificationScheme,
  createClassificationValue,
  createInstrument,
  createPortfolio,
  deleteClassificationScheme,
  deleteClassificationValue,
  deleteInstrument,
  deletePortfolio,
  fetchClassificationSchemes,
  fetchCurrentSnapshot,
  fetchInstrumentClassifications,
  fetchInstruments,
  fetchPortfolio,
  formatApiError,
  isWritableDataSource,
  replaceCurrentSnapshot,
  setInstrumentClassifications,
  updateClassificationScheme,
  updateClassificationValue,
  updateInstrument,
  updatePortfolio,
} from "@/lib/api-client";
import { WRITABLE_BLOCKED_MESSAGE } from "@/lib/data-source";

function mockJsonResponse(
  init: {
    ok: boolean;
    status: number;
    json?: () => Promise<unknown>;
  },
) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init.ok,
    status: init.status,
    json: init.json ?? (async () => ({})),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("isWritableDataSource", () => {
  const original = process.env.NEXT_PUBLIC_DATA_SOURCE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    } else {
      process.env.NEXT_PUBLIC_DATA_SOURCE = original;
    }
  });

  it("returns true when data source is api", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "api";
    expect(isWritableDataSource()).toBe(true);
  });

  it("returns false when data source is static", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    expect(isWritableDataSource()).toBe(false);
  });
});

describe("formatApiError", () => {
  it("returns string error message", () => {
    expect(formatApiError({ error: "見つかりません" })).toBe("見つかりません");
  });

  it("joins field error messages", () => {
    expect(
      formatApiError({
        error: {
          fieldErrors: {
            name: ["名前は必須です"],
            code: ["コードは必須です"],
          },
        },
      }),
    ).toBe("名前は必須です コードは必須です");
  });

  it("returns default message when field errors are empty", () => {
    expect(formatApiError({ error: { fieldErrors: {} } })).toBe(
      "リクエストに失敗しました。",
    );
  });
});

describe("api-client fetch functions", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const portfolio = {
    id: "p1",
    code: "ideco",
    name: "iDeCo",
    kind: "ideco",
  };

  const instrument = {
    id: "i1",
    portfolioId: "p1",
    accountId: "ideco:manual",
    name: "テスト銘柄",
    instrumentType: "fund",
    currency: "JPY",
    externalId: null,
  };

  type FetchCase = {
    label: string;
    run: () => Promise<unknown>;
    pathSuffix: string;
    method?: string;
    successBody?: unknown;
  };

  const cases: FetchCase[] = [
    {
      label: "fetchPortfolio",
      run: () => fetchPortfolio("ideco"),
      pathSuffix: "/portfolios/ideco",
      successBody: portfolio,
    },
    {
      label: "createPortfolio",
      run: () =>
        createPortfolio({ code: "ideco", name: "iDeCo", kind: "ideco" }),
      pathSuffix: "/portfolios",
      method: "POST",
      successBody: portfolio,
    },
    {
      label: "updatePortfolio",
      run: () => updatePortfolio("ideco", { name: "更新", kind: "ideco" }),
      pathSuffix: "/portfolios/ideco",
      method: "PUT",
      successBody: portfolio,
    },
    {
      label: "deletePortfolio",
      run: () => deletePortfolio("ideco"),
      pathSuffix: "/portfolios/ideco",
      method: "DELETE",
      successBody: { ok: true },
    },
    {
      label: "fetchClassificationSchemes",
      run: () => fetchClassificationSchemes("ideco"),
      pathSuffix: "/portfolios/ideco/classification-schemes",
      successBody: [],
    },
    {
      label: "createClassificationScheme",
      run: () =>
        createClassificationScheme("ideco", { code: "region", name: "地域" }),
      pathSuffix: "/portfolios/ideco/classification-schemes",
      method: "POST",
      successBody: { id: "s1", code: "region", name: "地域" },
    },
    {
      label: "updateClassificationScheme",
      run: () => updateClassificationScheme("s1", { name: "地域区分" }),
      pathSuffix: "/classification-schemes/s1",
      method: "PUT",
      successBody: { id: "s1", code: "region", name: "地域区分" },
    },
    {
      label: "deleteClassificationScheme",
      run: () => deleteClassificationScheme("s1"),
      pathSuffix: "/classification-schemes/s1",
      method: "DELETE",
      successBody: { ok: true },
    },
    {
      label: "createClassificationValue",
      run: () =>
        createClassificationValue("s1", { code: "japan", name: "日本" }),
      pathSuffix: "/classification-schemes/s1/values",
      method: "POST",
      successBody: { id: "v1", code: "japan", name: "日本", sortOrder: 0 },
    },
    {
      label: "updateClassificationValue",
      run: () =>
        updateClassificationValue("v1", { name: "日本株", sortOrder: 1 }),
      pathSuffix: "/classification-values/v1",
      method: "PUT",
      successBody: { id: "v1", code: "japan", name: "日本株", sortOrder: 1 },
    },
    {
      label: "deleteClassificationValue",
      run: () => deleteClassificationValue("v1"),
      pathSuffix: "/classification-values/v1",
      method: "DELETE",
      successBody: { ok: true },
    },
    {
      label: "fetchInstruments without query",
      run: () => fetchInstruments(),
      pathSuffix: "/instruments",
      successBody: [instrument],
    },
    {
      label: "createInstrument",
      run: () =>
        createInstrument({
          portfolioCode: "ideco",
          accountId: "ideco:manual",
          name: "テスト銘柄",
        }),
      pathSuffix: "/instruments",
      method: "POST",
      successBody: instrument,
    },
    {
      label: "updateInstrument",
      run: () => updateInstrument("i1", { name: "更新銘柄" }),
      pathSuffix: "/instruments/i1",
      method: "PUT",
      successBody: instrument,
    },
    {
      label: "deleteInstrument",
      run: () => deleteInstrument("i1"),
      pathSuffix: "/instruments/i1",
      method: "DELETE",
      successBody: { ok: true },
    },
    {
      label: "fetchInstrumentClassifications",
      run: () => fetchInstrumentClassifications("i1"),
      pathSuffix: "/instruments/i1/classifications",
      successBody: { classificationValueIds: ["v1"] },
    },
    {
      label: "setInstrumentClassifications",
      run: () =>
        setInstrumentClassifications("i1", {
          classificationValueIds: ["v1"],
        }),
      pathSuffix: "/instruments/i1/classifications",
      method: "PUT",
      successBody: { ok: true },
    },
    {
      label: "fetchCurrentSnapshot",
      run: () => fetchCurrentSnapshot("ideco"),
      pathSuffix: "/portfolios/ideco/snapshot/current",
      successBody: { asOfDate: "2026-06-01", lines: [] },
    },
    {
      label: "replaceCurrentSnapshot",
      run: () =>
        replaceCurrentSnapshot("ideco", {
          asOfDate: "2026-06-01",
          lines: [],
        }),
      pathSuffix: "/portfolios/ideco/snapshot/current",
      method: "PUT",
      successBody: { asOfDate: "2026-06-01", lines: [] },
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.label} succeeds`, async () => {
      const fetchMock = mockJsonResponse({
        ok: true,
        status: 200,
        json: async () => testCase.successBody ?? {},
      });

      const result = await testCase.run();

      expect(result).toEqual({ ok: true, data: testCase.successBody ?? {} });
      expect(fetchMock).toHaveBeenCalledWith(
        `http://127.0.0.1:3001${testCase.pathSuffix}`,
        testCase.method
          ? expect.objectContaining({
              method: testCase.method,
              headers: expect.objectContaining({
                "Content-Type": "application/json",
              }),
            })
          : expect.objectContaining({
              headers: expect.objectContaining({
                "Content-Type": "application/json",
              }),
            }),
      );
    });

    it(`${testCase.label} handles 204 No Content`, async () => {
      mockJsonResponse({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error("no body");
        },
      });

      const result = await testCase.run();

      expect(result).toEqual({ ok: true, data: undefined });
    });

    it(`${testCase.label} handles HTTP error with JSON body`, async () => {
      mockJsonResponse({
        ok: false,
        status: 404,
        json: async () => ({ error: "見つかりません" }),
      });

      const result = await testCase.run();

      expect(result).toEqual({
        ok: false,
        status: 404,
        message: "見つかりません",
      });
    });

    it(`${testCase.label} handles HTTP error without JSON body`, async () => {
      mockJsonResponse({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("invalid json");
        },
      });

      const result = await testCase.run();

      expect(result).toEqual({
        ok: false,
        status: 500,
        message: "HTTP 500",
      });
    });

    it(`${testCase.label} handles network error`, async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

      const result = await testCase.run();

      expect(result).toEqual({
        ok: false,
        status: 0,
        message:
          "API に接続できません。`npm run dev:api` でローカル API を起動してください。",
      });
    });
  }

  it("fetchInstruments with search query encodes q parameter", async () => {
    const fetchMock = mockJsonResponse({
      ok: true,
      status: 200,
      json: async () => [],
    });

    await fetchInstruments(undefined, " テスト ");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/instruments?q=%E3%83%86%E3%82%B9%E3%83%88",
      expect.any(Object),
    );
  });

  it("fetchInstruments ignores blank search query", async () => {
    const fetchMock = mockJsonResponse({
      ok: true,
      status: 200,
      json: async () => [],
    });

    await fetchInstruments(undefined, "   ");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3001/instruments",
      expect.any(Object),
    );
  });

  it("blocks mutations without calling fetch in static mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await createPortfolio({
      code: "ideco",
      name: "iDeCo",
      kind: "ideco",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      message: WRITABLE_BLOCKED_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();

    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("returns empty classification schemes without calling fetch in static mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchClassificationSchemes("ideco");

    expect(result).toEqual({ ok: true, data: [] });
    expect(fetchMock).not.toHaveBeenCalled();

    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });
});
