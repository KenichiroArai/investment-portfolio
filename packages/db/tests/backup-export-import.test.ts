import { afterEach, describe, expect, it } from "vitest";

import {
  createBackupZipBuffer,
  createClassificationScheme,
  createClassificationValue,
  createPortfolio,
  exportPortfolioBackup,
  extractBackupZipBuffer,
  importPortfolioBackup,
  replaceCurrentSnapshot,
  upsertInstrument,
} from "@repo/db";

import { createTestDb } from "../src/test-utils";

describe("backup export/import", () => {
  const instances: ReturnType<typeof createTestDb>[] = [];

  afterEach(() => {
    for (const instance of instances) {
      instance.sqlite.close();
    }
    instances.length = 0;
  });

  function setup() {
    const instance = createTestDb();
    instances.push(instance);
    return instance;
  }

  async function seedPortfolio(db: ReturnType<typeof createTestDb>["db"], code: string) {
    await createPortfolio(db, { code, name: code.toUpperCase(), kind: "ideco" });
    const scheme = await createClassificationScheme(db, {
      portfolioCode: code,
      code: "asset_class",
      name: "資産クラス",
    });
    await createClassificationValue(db, {
      schemeId: scheme.id,
      code: "equity",
      name: "株式",
      sortOrder: 1,
    });
    const instrument = await upsertInstrument(db, {
      portfolioCode: code,
      accountId: `${code}:unknown`,
      name: "テスト銘柄",
      instrumentType: "mutual_fund",
      currency: "JPY",
      externalId: null,
    });
    await replaceCurrentSnapshot(db, {
      portfolioCode: code,
      asOfDate: "2026-01-01",
      lines: [
        {
          instrumentId: instrument.id,
          accountId: `${code}:unknown`,
          accountName: "不明口座",
          quantity: 1,
          marketValueMinor: 100_000,
          bookValueMinor: 90_000,
          metrics: [],
        },
      ],
      metrics: [
        {
          code: "total_market_value_minor",
          integerValue: 100_000,
          realValue: null,
          textValue: null,
        },
      ],
    });
  }

  it("exports and imports all portfolios with merge mode", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");
    await seedPortfolio(db, "monex");

    const exported = await exportPortfolioBackup(sqlite, { type: "all" });
    const zipBuffer = createBackupZipBuffer(exported.manifest, exported.files);
    const extracted = extractBackupZipBuffer(zipBuffer);

    expect(extracted.manifest.scope).toBe("all");
    expect(extracted.manifest.rowCounts.portfolios).toBe(2);

    const preview = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "all" },
      dryRun: true,
    });

    expect("warnings" in preview).toBe(true);

    const imported = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "all" },
      dryRun: false,
    });

    expect(imported.ok).toBe(true);
    expect(imported.tables.find((table) => table.table === "portfolios")?.insert).toBe(0);
  });

  it("merges portfolio_snapshot_metrics when business key matches but id differs", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const zipBuffer = createBackupZipBuffer(exported.manifest, exported.files);

    const existing = sqlite
      .prepare(
        `SELECT id, snapshot_id, code
         FROM portfolio_snapshot_metrics
         WHERE code = 'total_market_value_minor'
         LIMIT 1`,
      )
      .get() as { id: string; snapshot_id: string; code: string };

    sqlite
      .prepare(
        `UPDATE portfolio_snapshot_metrics
         SET id = ?, integer_value = 1
         WHERE id = ?`,
      )
      .run("regen-metric-id", existing.id);

    const imported = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: false,
    });

    expect(imported.ok).toBe(true);

    const merged = sqlite
      .prepare(
        `SELECT id, integer_value
         FROM portfolio_snapshot_metrics
         WHERE snapshot_id = ? AND code = ?`,
      )
      .get(existing.snapshot_id, existing.code) as {
      id: string;
      integer_value: number;
    };

    expect(merged.id).toBe(existing.id);
    expect(merged.integer_value).toBe(100_000);
  });

  it("exports and imports a single portfolio with replace mode", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");
    await seedPortfolio(db, "monex");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const zipBuffer = createBackupZipBuffer(exported.manifest, exported.files);

    await replaceCurrentSnapshot(db, {
      portfolioCode: "ideco",
      asOfDate: "2026-02-01",
      lines: [],
      metrics: [],
    });

    const imported = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "replace",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: false,
    });

    expect(imported.ok).toBe(true);

    const current = sqlite
      .prepare(
        `SELECT ps.as_of_date
         FROM portfolio_snapshots ps
         INNER JOIN portfolios p ON p.id = ps.portfolio_id
         WHERE p.code = ? AND ps.is_current = 1`,
      )
      .get("ideco") as { as_of_date: string };

    expect(current.as_of_date).toBe("2026-01-01");

    const monexCount = sqlite
      .prepare("SELECT COUNT(*) AS count FROM portfolios WHERE code = 'monex'")
      .get() as { count: number };
    expect(monexCount.count).toBe(1);
  });

  it("rejects portfolio import when manifest scope is all", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, { type: "all" });
    const zipBuffer = createBackupZipBuffer(exported.manifest, exported.files);

    expect(() =>
      importPortfolioBackup(sqlite, zipBuffer, {
        mode: "merge",
        scope: { type: "portfolio", portfolioCode: "ideco" },
        dryRun: true,
      }),
    ).toThrow(/全口座バックアップ/);
  });
});
