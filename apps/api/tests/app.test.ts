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
    delete process.env.SEED_SAMPLE_DATA;
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
      sampleMode: false,
      sampleSeeded: false,
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
});
