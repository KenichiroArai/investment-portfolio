import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app";
import { initDatabase, resetDatabaseCacheForTests } from "../src/db";
import { createTestDb } from "../../../packages/db/src/test-utils";

describe("API app", () => {
  const originalDbPath = process.env.DATABASE_PATH;

  afterEach(() => {
    resetDatabaseCacheForTests();
    if (originalDbPath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalDbPath;
    }
  });

  it("uses default database when no getDb override", async () => {
    const path = join(tmpdir(), `api-default-${Date.now()}.db`);
    mkdirSync(tmpdir(), { recursive: true });
    process.env.DATABASE_PATH = path;
    await initDatabase();
    const app = createApp();
    const res = await app.request("/portfolios");
    expect(res.status).toBe(200);
  });

  it("returns health and manages ideco snapshot flow", async () => {
    const { db, sqlite } = createTestDb();
    const app = createApp({ getDb: () => db });

    const health = await app.request("/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({
      status: "ok",
      databasePath: null,
    });

    const list = await app.request("/portfolios");
    expect(list.status).toBe(200);

    const createPortfolioRes = await app.request("/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "ideco",
        name: "iDeCo",
        kind: "ideco",
      }),
    });
    expect(createPortfolioRes.status).toBe(201);

    const schemeRes = await app.request("/portfolios/ideco/classification-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "region", name: "地域" }),
    });
    const scheme = (await schemeRes.json()) as { id: string };

    const valueRes = await app.request(`/classification-schemes/${scheme.id}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "japan", name: "日本" }),
    });
    const value = (await valueRes.json()) as { id: string };

    const instrumentRes = await app.request("/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "テストファンド" }),
    });
    const instrument = (await instrumentRes.json()) as { id: string };

    await app.request(`/instruments/${instrument.id}/classifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classificationValueIds: [value.id] }),
    });

    const putSnapshot = await app.request("/portfolios/ideco/snapshot/current", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asOfDate: "2026-06-01",
        lines: [
          {
            instrumentId: instrument.id,
            quantity: 10,
            marketValueMinor: 10000,
          },
        ],
      }),
    });
    expect(putSnapshot.status).toBe(200);

    const getSnapshot = await app.request("/portfolios/ideco/snapshot/current");
    expect(getSnapshot.status).toBe(200);
    const body = (await getSnapshot.json()) as { lines: unknown[] };
    expect(body.lines).toHaveLength(1);

    const putOlderSnapshot = await app.request("/portfolios/ideco/snapshot/current", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asOfDate: "2026-05-01",
        lines: [
          {
            instrumentId: instrument.id,
            quantity: 5,
            marketValueMinor: 5000,
          },
        ],
      }),
    });
    expect(putOlderSnapshot.status).toBe(200);

    const listSnapshots = await app.request("/portfolios/ideco/snapshots");
    expect(listSnapshots.status).toBe(200);
    const snapshotDates = (await listSnapshots.json()) as {
      dates: Array<{ asOfDate: string }>;
    };
    expect(snapshotDates.dates.length).toBeGreaterThanOrEqual(2);

    const byDate = await app.request("/portfolios/ideco/snapshots/2026-05-01");
    expect(byDate.status).toBe(200);

    const trends = await app.request(
      "/portfolios/ideco/snapshots/trends?from=2026-05-01&to=2026-06-01",
    );
    expect(trends.status).toBe(200);
    const trendsBody = (await trends.json()) as { points: unknown[] };
    expect(trendsBody.points.length).toBeGreaterThan(0);

    sqlite.close();
  });

  it("returns validation and not found errors", async () => {
    const { db, sqlite } = createTestDb();
    const app = createApp({ getDb: () => db });

    await app.request("/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "ideco",
        name: "iDeCo",
        kind: "ideco",
      }),
    });

    const schemeRes = await app.request("/portfolios/ideco/classification-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "region", name: "地域" }),
    });
    const scheme = (await schemeRes.json()) as { id: string };

    const badValue = await app.request(
      `/classification-schemes/${scheme.id}/values`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "", name: "" }),
      },
    );
    expect(badValue.status).toBe(400);

    const badPortfolio = await app.request("/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "", name: "", kind: "bad" }),
    });
    expect(badPortfolio.status).toBe(400);

    const noSnapshot = await app.request("/portfolios/ideco/snapshot/current");
    expect(noSnapshot.status).toBe(404);

    const missingScheme = await app.request(
      "/portfolios/unknown/classification-schemes",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "x", name: "X" }),
      },
    );
    expect(missingScheme.status).toBe(404);

    const missingSchemeValue = await app.request(
      "/classification-schemes/00000000-0000-4000-8000-000000000099/values",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "a", name: "A" }),
      },
    );
    expect(missingSchemeValue.status).toBe(404);

    const badScheme = await app.request("/portfolios/ideco/classification-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "", name: "" }),
    });
    expect(badScheme.status).toBe(400);

    const badInstrument = await app.request("/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    expect(badInstrument.status).toBe(400);

    const badSnapshot = await app.request("/portfolios/ideco/snapshot/current", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asOfDate: "invalid", lines: [] }),
    });
    expect(badSnapshot.status).toBe(400);

    const missingPortfolioSnapshot = await app.request(
      "/portfolios/unknown/snapshot/current",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asOfDate: "2026-06-01", lines: [] }),
      },
    );
    expect(missingPortfolioSnapshot.status).toBe(404);

    const missingInstrumentGet = await app.request(
      "/instruments/00000000-0000-4000-8000-000000000099/classifications",
    );
    expect(missingInstrumentGet.status).toBe(404);

    const missingInstrument = await app.request(
      "/instruments/00000000-0000-4000-8000-000000000099/classifications",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classificationValueIds: ["550e8400-e29b-41d4-a716-446655440000"],
        }),
      },
    );
    expect(missingInstrument.status).toBe(404);

    const badTags = await app.request(
      `/instruments/00000000-0000-4000-8000-000000000099/classifications`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classificationValueIds: ["not-uuid"] }),
      },
    );
    expect(badTags.status).toBe(400);

    sqlite.close();
  });

  it("supports portfolio, classification, and instrument CRUD", async () => {
    const { db, sqlite } = createTestDb();
    const app = createApp({ getDb: () => db });

    const createPortfolioRes = await app.request("/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "test",
        name: "テスト口座",
        kind: "taxable",
      }),
    });
    expect(createPortfolioRes.status).toBe(201);

    const getPortfolio = await app.request("/portfolios/test");
    expect(getPortfolio.status).toBe(200);

    const updatePortfolioRes = await app.request("/portfolios/test", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "更新口座",
        kind: "nisa",
      }),
    });
    expect(updatePortfolioRes.status).toBe(200);
    const updatedPortfolio = (await updatePortfolioRes.json()) as { name: string };
    expect(updatedPortfolio.name).toBe("更新口座");

    const schemeRes = await app.request("/portfolios/test/classification-schemes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "region", name: "地域" }),
    });
    const scheme = (await schemeRes.json()) as { id: string };

    const listSchemes = await app.request("/portfolios/test/classification-schemes");
    expect(listSchemes.status).toBe(200);
    const schemes = (await listSchemes.json()) as Array<{ values: unknown[] }>;
    expect(schemes).toHaveLength(1);

    const updateScheme = await app.request(`/classification-schemes/${scheme.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "地域区分" }),
    });
    expect(updateScheme.status).toBe(200);

    const valueRes = await app.request(`/classification-schemes/${scheme.id}/values`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "japan", name: "日本", sortOrder: 1 }),
    });
    const value = (await valueRes.json()) as { id: string };

    const updateValue = await app.request(`/classification-values/${value.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "日本株", sortOrder: 2 }),
    });
    expect(updateValue.status).toBe(200);

    const instrumentRes = await app.request("/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "テスト銘柄" }),
    });
    const instrument = (await instrumentRes.json()) as { id: string };

    const listInstruments = await app.request("/instruments?q=テスト");
    expect(listInstruments.status).toBe(200);
    const instrumentRows = (await listInstruments.json()) as unknown[];
    expect(instrumentRows).toHaveLength(1);

    const updateInstrumentRes = await app.request(`/instruments/${instrument.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "更新銘柄" }),
    });
    expect(updateInstrumentRes.status).toBe(200);

    await app.request(`/instruments/${instrument.id}/classifications`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classificationValueIds: [value.id] }),
    });

    const getClassifications = await app.request(
      `/instruments/${instrument.id}/classifications`,
    );
    expect(getClassifications.status).toBe(200);
    const classifications = (await getClassifications.json()) as {
      classificationValueIds: string[];
    };
    expect(classifications.classificationValueIds).toEqual([value.id]);

    await app.request("/portfolios/test/snapshot/current", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asOfDate: "2026-06-01",
        lines: [
          {
            instrumentId: instrument.id,
            quantity: 1,
            marketValueMinor: 1000,
          },
        ],
      }),
    });

    const deleteInstrumentInUse = await app.request(`/instruments/${instrument.id}`, {
      method: "DELETE",
    });
    expect(deleteInstrumentInUse.status).toBe(409);

    const deleteValue = await app.request(`/classification-values/${value.id}`, {
      method: "DELETE",
    });
    expect(deleteValue.status).toBe(200);

    const deleteScheme = await app.request(`/classification-schemes/${scheme.id}`, {
      method: "DELETE",
    });
    expect(deleteScheme.status).toBe(200);

    const deletePortfolioRes = await app.request("/portfolios/test", {
      method: "DELETE",
    });
    expect(deletePortfolioRes.status).toBe(200);

    const missingPortfolio = await app.request("/portfolios/test");
    expect(missingPortfolio.status).toBe(404);

    sqlite.close();
  });
});
