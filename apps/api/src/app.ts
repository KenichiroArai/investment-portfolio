import {
  createClassificationScheme,
  createClassificationValue,
  createInstrument,
  createPortfolio,
  findInstrumentById,
  findSchemeById,
  getCurrentSnapshot,
  listPortfolios,
  replaceCurrentSnapshot,
  setInstrumentClassifications,
  type AppDatabase,
} from "@repo/db";
import {
  createClassificationSchemeSchema,
  createClassificationValueSchema,
  createInstrumentSchema,
  createPortfolioSchema,
  replaceCurrentSnapshotSchema,
  setInstrumentClassificationsSchema,
} from "@repo/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { getDatabase } from "./db";

export type CreateAppOptions = {
  getDb?: () => AppDatabase;
};

export function createApp(options?: CreateAppOptions) {
  const resolveDb = options?.getDb ?? getDatabase;
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => {
    const result = c.json({ status: "ok" as const });
    return result;
  });

  app.get("/portfolios", async (c) => {
    const db = resolveDb();
    const rows = await listPortfolios(db);
    const result = c.json(rows);
    return result;
  });

  app.post("/portfolios", async (c) => {
    const body = await c.req.json();
    const parsed = createPortfolioSchema.safeParse(body);
    if (!parsed.success) {
      const result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const row = await createPortfolio(db, parsed.data);
    const result = c.json(row, 201);
    return result;
  });

  app.post("/portfolios/:code/classification-schemes", async (c) => {
    const body = await c.req.json();
    const parsed = createClassificationSchemeSchema.safeParse(body);
    if (!parsed.success) {
      const result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const row = await createClassificationScheme(db, {
      portfolioCode: c.req.param("code"),
      ...parsed.data,
    });
    if (!row) {
      const result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    const response = c.json(row, 201);
    return response;
  });

  app.post("/classification-schemes/:id/values", async (c) => {
    const body = await c.req.json();
    const parsed = createClassificationValueSchema.safeParse(body);
    if (!parsed.success) {
      const result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const schemeId = c.req.param("id");
    const db = resolveDb();
    const scheme = await findSchemeById(db, schemeId);
    if (!scheme) {
      const result = c.json({ error: "Scheme not found" }, 404);
      return result;
    }

    const row = await createClassificationValue(db, {
      schemeId,
      ...parsed.data,
    });
    const result = c.json(row, 201);
    return result;
  });

  app.post("/instruments", async (c) => {
    const body = await c.req.json();
    const parsed = createInstrumentSchema.safeParse(body);
    if (!parsed.success) {
      const result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const row = await createInstrument(db, parsed.data);
    const result = c.json(row, 201);
    return result;
  });

  app.put("/instruments/:id/classifications", async (c) => {
    const body = await c.req.json();
    const parsed = setInstrumentClassificationsSchema.safeParse(body);
    if (!parsed.success) {
      const result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const instrumentId = c.req.param("id");
    const db = resolveDb();
    const instrument = await findInstrumentById(db, instrumentId);
    if (!instrument) {
      const result = c.json({ error: "Instrument not found" }, 404);
      return result;
    }

    await setInstrumentClassifications(
      db,
      instrumentId,
      parsed.data.classificationValueIds,
    );
    const result = c.json({ ok: true });
    return result;
  });

  app.get("/portfolios/:code/snapshot/current", async (c) => {
    const db = resolveDb();
    const snapshot = await getCurrentSnapshot(db, c.req.param("code"));
    if (!snapshot) {
      const result = c.json({ error: "No current snapshot" }, 404);
      return result;
    }

    const response = c.json(snapshot);
    return response;
  });

  app.put("/portfolios/:code/snapshot/current", async (c) => {
    const body = await c.req.json();
    const parsed = replaceCurrentSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      const result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const snapshot = await replaceCurrentSnapshot(db, {
      portfolioCode: c.req.param("code"),
      ...parsed.data,
    });
    if (!snapshot) {
      const result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    const response = c.json(snapshot);
    return response;
  });

  return app;
}
