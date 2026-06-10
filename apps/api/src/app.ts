import {
  createClassificationScheme,
  createClassificationValue,
  createInstrument,
  createPortfolio,
  deleteClassificationSchemeById,
  deleteClassificationValueById,
  deleteInstrument,
  deletePortfolio,
  findClassificationValueById,
  findInstrumentById,
  findPortfolioByCode,
  findSchemeById,
  getCurrentSnapshot,
  getSnapshotByDate,
  getSnapshotsInDateRange,
  listInstrumentClassificationValueIds,
  listInstruments,
  listPortfolios,
  listSchemesWithValuesForPortfolio,
  listSnapshotDates,
  replaceCurrentSnapshot,
  setInstrumentClassifications,
  updateClassificationSchemeName,
  updateClassificationValue,
  updateInstrument,
  updatePortfolio,
  type AppDatabase,
} from "@repo/db";
import {
  buildSnapshotTrends,
  createClassificationSchemeSchema,
  createClassificationValueSchema,
  createInstrumentSchema,
  createPortfolioSchema,
  replaceCurrentSnapshotSchema,
  setInstrumentClassificationsSchema,
  snapshotTrendsQuerySchema,
  updateClassificationSchemeSchema,
  updateClassificationValueSchema,
  updateInstrumentSchema,
  updatePortfolioSchema,
} from "@repo/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { getDatabase, getDatabasePath } from "./db";

export type CreateAppOptions = {
  getDb?: () => AppDatabase;
};

export function createApp(options?: CreateAppOptions) {
  let result!: Hono;
  const resolveDb = options?.getDb ?? getDatabase;
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.get("/health", (c) => {
    let result = c.json({
      status: "ok" as const,
      databasePath: getDatabasePath(),
    });
    return result;
  });

  app.get("/portfolios", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const rows = await listPortfolios(db);
    result = c.json(rows);
    return result;
  });

  app.get("/portfolios/:code", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const portfolio = await findPortfolioByCode(db, c.req.param("code"));
    if (!portfolio) {
      result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    result = c.json({
      id: portfolio.id,
      code: portfolio.code,
      name: portfolio.name,
      kind: portfolio.kind,
    });
    return result;
  });

  app.put("/portfolios/:code", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = updatePortfolioSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const portfolio = await updatePortfolio(db, c.req.param("code"), parsed.data);
    if (!portfolio) {
      result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    result = c.json({
      id: portfolio.id,
      code: portfolio.code,
      name: portfolio.name,
      kind: portfolio.kind,
    });
    return result;
  });

  app.delete("/portfolios/:code", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const deleted = await deletePortfolio(db, c.req.param("code"));
    if (!deleted) {
      result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    result = c.json({ ok: true });
    return result;
  });

  app.post("/portfolios", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = createPortfolioSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const row = await createPortfolio(db, parsed.data);
    result = c.json(row, 201);
    return result;
  });

  app.get("/portfolios/:code/classification-schemes", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const portfolioCode = c.req.param("code");
    const portfolio = await findPortfolioByCode(db, portfolioCode);
    if (!portfolio) {
      result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    const schemes = await listSchemesWithValuesForPortfolio(db, portfolioCode);
    result = c.json(schemes);
    return result;
  });

  app.post("/portfolios/:code/classification-schemes", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = createClassificationSchemeSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const row = await createClassificationScheme(db, {
      portfolioCode: c.req.param("code"),
      ...parsed.data,
    });
    if (!row) {
      result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    result = c.json(row, 201);
    return result;
  });

  app.put("/classification-schemes/:id", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = updateClassificationSchemeSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const schemeId = c.req.param("id");
    const db = resolveDb();
    const scheme = await findSchemeById(db, schemeId);
    if (!scheme) {
      result = c.json({ error: "Scheme not found" }, 404);
      return result;
    }

    await updateClassificationSchemeName(db, schemeId, parsed.data.name);
    result = c.json({
      id: scheme.id,
      code: scheme.code,
      name: parsed.data.name,
    });
    return result;
  });

  app.delete("/classification-schemes/:id", async (c) => {
    let result!: Response;

    const schemeId = c.req.param("id");
    const db = resolveDb();
    const scheme = await findSchemeById(db, schemeId);
    if (!scheme) {
      result = c.json({ error: "Scheme not found" }, 404);
      return result;
    }

    await deleteClassificationSchemeById(db, schemeId);
    result = c.json({ ok: true });
    return result;
  });

  app.post("/classification-schemes/:id/values", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = createClassificationValueSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const schemeId = c.req.param("id");
    const db = resolveDb();
    const scheme = await findSchemeById(db, schemeId);
    if (!scheme) {
      result = c.json({ error: "Scheme not found" }, 404);
      return result;
    }

    const row = await createClassificationValue(db, {
      schemeId,
      ...parsed.data,
    });
    result = c.json(row, 201);
    return result;
  });

  app.put("/classification-values/:id", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = updateClassificationValueSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const valueId = c.req.param("id");
    const db = resolveDb();
    const value = await findClassificationValueById(db, valueId);
    if (!value) {
      result = c.json({ error: "Value not found" }, 404);
      return result;
    }

    await updateClassificationValue(db, valueId, parsed.data);
    result = c.json({
      id: value.id,
      code: value.code,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
    });
    return result;
  });

  app.delete("/classification-values/:id", async (c) => {
    let result!: Response;

    const valueId = c.req.param("id");
    const db = resolveDb();
    const deleted = await deleteClassificationValueById(db, valueId);
    if (!deleted) {
      result = c.json({ error: "Value not found" }, 404);
      return result;
    }

    result = c.json({ ok: true });
    return result;
  });

  app.get("/instruments", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const searchQuery = c.req.query("q");
    const rows = await listInstruments(db, searchQuery);
    result = c.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        instrumentType: row.instrumentType,
        currency: row.currency,
        externalId: row.externalId,
      })),
    );
    return result;
  });

  app.post("/instruments", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = createInstrumentSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const row = await createInstrument(db, parsed.data);
    result = c.json(row, 201);
    return result;
  });

  app.put("/instruments/:id", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = updateInstrumentSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const instrumentId = c.req.param("id");
    const db = resolveDb();
    const instrument = await updateInstrument(db, instrumentId, parsed.data);
    if (!instrument) {
      result = c.json({ error: "Instrument not found" }, 404);
      return result;
    }

    result = c.json({
      id: instrument.id,
      name: instrument.name,
      instrumentType: instrument.instrumentType,
      currency: instrument.currency,
      externalId: instrument.externalId,
    });
    return result;
  });

  app.delete("/instruments/:id", async (c) => {
    let result!: Response;

    const instrumentId = c.req.param("id");
    const db = resolveDb();
    const deleteResult = await deleteInstrument(db, instrumentId);
    if (deleteResult === "not_found") {
      result = c.json({ error: "Instrument not found" }, 404);
      return result;
    }
    if (deleteResult === "in_use") {
      result = c.json(
        { error: "Instrument is referenced by holding lines" },
        409,
      );
      return result;
    }

    result = c.json({ ok: true });
    return result;
  });

  app.get("/instruments/:id/classifications", async (c) => {
    let result!: Response;

    const instrumentId = c.req.param("id");
    const db = resolveDb();
    const instrument = await findInstrumentById(db, instrumentId);
    if (!instrument) {
      result = c.json({ error: "Instrument not found" }, 404);
      return result;
    }

    const classificationValueIds = await listInstrumentClassificationValueIds(
      db,
      instrumentId,
    );
    result = c.json({ classificationValueIds });
    return result;
  });

  app.put("/instruments/:id/classifications", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = setInstrumentClassificationsSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const instrumentId = c.req.param("id");
    const db = resolveDb();
    const instrument = await findInstrumentById(db, instrumentId);
    if (!instrument) {
      result = c.json({ error: "Instrument not found" }, 404);
      return result;
    }

    await setInstrumentClassifications(
      db,
      instrumentId,
      parsed.data.classificationValueIds,
    );
    result = c.json({ ok: true });
    return result;
  });

  app.get("/portfolios/:code/snapshots", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const portfolioCode = c.req.param("code");
    const dates = await listSnapshotDates(db, portfolioCode);
    if (dates.length === 0) {
      const portfolio = await listPortfolios(db);
      const exists = portfolio.some((item) => item.code === portfolioCode);
      if (!exists) {
        result = c.json({ error: "Portfolio not found" }, 404);
        return result;
      }
    }

    result = c.json({
      portfolioCode,
      dates,
    });
    return result;
  });

  app.get("/portfolios/:code/snapshots/trends", async (c) => {
    let result!: Response;

    const query = snapshotTrendsQuerySchema.safeParse({
      from: c.req.query("from"),
      to: c.req.query("to"),
    });
    if (!query.success) {
      result = c.json({ error: query.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const portfolioCode = c.req.param("code");
    const dateList = await listSnapshotDates(db, portfolioCode);
    if (dateList.length === 0) {
      const portfolio = await listPortfolios(db);
      const exists = portfolio.some((item) => item.code === portfolioCode);
      if (!exists) {
        result = c.json({ error: "Portfolio not found" }, 404);
        return result;
      }
      result = c.json({
        portfolioCode,
        from: query.data.from ?? "",
        to: query.data.to ?? "",
        points: [],
      });
      return result;
    }

    const sortedDates = [...dateList]
      .map((item) => item.asOfDate)
      .sort((left, right) => left.localeCompare(right));
    const from = query.data.from ?? sortedDates[0];
    const to = query.data.to ?? sortedDates[sortedDates.length - 1];
    const snapshots = await getSnapshotsInDateRange(db, portfolioCode, from, to);
    const trends = buildSnapshotTrends(portfolioCode, snapshots, from, to);
    result = c.json(trends);
    return result;
  });

  app.get("/portfolios/:code/snapshots/:asOfDate", async (c) => {
    let result!: Response;

    const asOfDate = c.req.param("asOfDate");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
      result = c.json({ error: "Invalid asOfDate" }, 400);
      return result;
    }

    const db = resolveDb();
    const snapshot = await getSnapshotByDate(db, c.req.param("code"), asOfDate);
    if (!snapshot) {
      result = c.json({ error: "Snapshot not found" }, 404);
      return result;
    }

    result = c.json(snapshot);
    return result;
  });

  app.get("/portfolios/:code/snapshot/current", async (c) => {
    let result!: Response;

    const db = resolveDb();
    const snapshot = await getCurrentSnapshot(db, c.req.param("code"));
    if (!snapshot) {
      result = c.json({ error: "No current snapshot" }, 404);
      return result;
    }

    result = c.json(snapshot);
    return result;
  });

  app.put("/portfolios/:code/snapshot/current", async (c) => {
    let result!: Response;

    const body = await c.req.json();
    const parsed = replaceCurrentSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      result = c.json({ error: parsed.error.flatten() }, 400);
      return result;
    }

    const db = resolveDb();
    const snapshot = await replaceCurrentSnapshot(db, {
      portfolioCode: c.req.param("code"),
      ...parsed.data,
    });
    if (!snapshot) {
      result = c.json({ error: "Portfolio not found" }, 404);
      return result;
    }

    result = c.json(snapshot);
    return result;
  });

  result = app;
  return result;
}
