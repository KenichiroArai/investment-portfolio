import { zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLE_NAMES,
  type BackupManifest,
  type BackupTableName,
  serializeCsvTable,
} from "@repo/shared";

import { buildBackupDeleteStatements, BACKUP_TABLE_CONFIGS } from "../src/backup/backup-tables";
import {
  createBackupZipBuffer,
  extractBackupZipBuffer,
} from "../src/backup/backup-zip";
import {
  parseBackupCellValue,
  rowRecordToInsertValues,
} from "../src/backup/csv-table-io";
import {
  BackupExportError,
  exportPortfolioBackup,
} from "../src/backup/export-portfolio-backup";
import {
  BackupImportError,
  importPortfolioBackup,
} from "../src/backup/import-portfolio-backup";
import {
  createClassificationScheme,
  createClassificationValue,
  createPortfolio,
  replaceCurrentSnapshot,
  upsertInstrument,
} from "@repo/db";

import { createTestDb } from "../src/test-utils";

function buildZipFromParts(
  manifest: BackupManifest,
  files: Partial<Record<BackupTableName, string>>,
  extraEntries: Record<string, string> = {},
): Buffer {
  let result = Buffer.alloc(0);
  const entries: Record<string, Uint8Array> = {
    "manifest.json": new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
  };

  for (const tableName of BACKUP_TABLE_NAMES) {
    entries[`${tableName}.csv`] = new TextEncoder().encode(files[tableName] ?? "");
  }

  for (const [name, content] of Object.entries(extraEntries)) {
    entries[name] = new TextEncoder().encode(content);
  }

  result = Buffer.from(zipSync(entries, { level: 6 }));
  return result;
}

describe("backup coverage edges", () => {
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

  it("buildBackupDeleteStatements covers all-scope and missing portfolio id", () => {
    const allDeletes = buildBackupDeleteStatements({ type: "all" }, null);
    expect(allDeletes.length).toBe(BACKUP_TABLE_NAMES.length);
    expect(allDeletes[0]?.params).toEqual([]);

    const empty = buildBackupDeleteStatements(
      { type: "portfolio", portfolioCode: "ideco" },
      null,
    );
    expect(empty).toEqual([]);
  });

  it("parseBackupCellValue keeps empty string for non-nullable columns", () => {
    const config = BACKUP_TABLE_CONFIGS.portfolios;
    expect(parseBackupCellValue("name", "   ", config)).toBe("");
    expect(parseBackupCellValue("name", "", config)).toBe("");

    const values = rowRecordToInsertValues({ id: "p1" }, config);
    expect(values.code).toBe("");
    expect(values.name).toBe("");
  });

  it("extractBackupZipBuffer skips non-csv entries and trailing-slash paths", () => {
    const manifest: BackupManifest = {
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "2026-01-01T00:00:00.000Z",
      scope: "all",
      portfolioCode: null,
      rowCounts: {},
    };
    const files = Object.fromEntries(
      BACKUP_TABLE_NAMES.map((tableName) => [tableName, "id\n"]),
    ) as Record<BackupTableName, string>;

    const zipBuffer = buildZipFromParts(manifest, files, {
      "notes/readme.txt": "ignore me",
      "nested/": "dir marker",
      "folder\\portfolios.csv": serializeCsvTable(["id"], [["alt"]]),
    });

    const extracted = extractBackupZipBuffer(zipBuffer);
    expect(extracted.manifest.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(extracted.files.portfolios).toContain("id");
  });

  it("throws BackupExportError when portfolio code is missing", async () => {
    const { sqlite } = setup();

    await expect(
      exportPortfolioBackup(sqlite, { type: "portfolio", portfolioCode: "missing" }),
    ).rejects.toSatisfy((error: unknown) => {
      let result = false;
      result =
        error instanceof BackupExportError &&
        error.name === "BackupExportError" &&
        /口座が見つかりません/.test(error.message);
      return result;
    });
  });

  it("rejects invalid manifest versions and mismatched portfolio codes", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });

    const badFormat = createBackupZipBuffer(
      { ...exported.manifest, formatVersion: 999 },
      exported.files,
    );
    expect(() =>
      importPortfolioBackup(sqlite, badFormat, {
        mode: "merge",
        scope: { type: "portfolio", portfolioCode: "ideco" },
        dryRun: true,
      }),
    ).toThrow(/formatVersion/);

    const badSchema = createBackupZipBuffer(
      { ...exported.manifest, schemaVersion: "0000" },
      exported.files,
    );
    expect(() =>
      importPortfolioBackup(sqlite, badSchema, {
        mode: "merge",
        scope: { type: "portfolio", portfolioCode: "ideco" },
        dryRun: true,
      }),
    ).toThrow(/schemaVersion/);

    const mismatched = createBackupZipBuffer(
      { ...exported.manifest, portfolioCode: "monex" },
      exported.files,
    );
    expect(() =>
      importPortfolioBackup(sqlite, mismatched, {
        mode: "merge",
        scope: { type: "portfolio", portfolioCode: "ideco" },
        dryRun: true,
      }),
    ).toThrow(/一致しません/);
  });

  it("rejects missing files and missing headers", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, { type: "all" });
    const incompleteFiles = { ...exported.files };
    delete incompleteFiles.instruments;

    const missingFileZip = buildZipFromParts(exported.manifest, incompleteFiles);
    expect(() =>
      importPortfolioBackup(sqlite, missingFileZip, {
        mode: "merge",
        scope: { type: "all" },
        dryRun: true,
      }),
    ).toThrow(/必須ファイルがありません/);

    const files = { ...exported.files };
    files.portfolios = serializeCsvTable(["id", "code"], [["p1", "ideco"]]);
    const missingHeaderZip = createBackupZipBuffer(exported.manifest, files);
    expect(() =>
      importPortfolioBackup(sqlite, missingHeaderZip, {
        mode: "merge",
        scope: { type: "all" },
        dryRun: true,
      }),
    ).toThrow(/必須列がありません/);
  });

  it("rejects foreign key violations across backup tables", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const files = { ...exported.files };

    const mutateFirstDataRow = (csv: string, column: string, value: string) => {
      let result = csv;
      const parsed = csv
        .replace(/^\uFEFF/, "")
        .trimEnd()
        .split("\n");
      const headers = parsed[0]?.split(",") ?? [];
      const columnIndex = headers.indexOf(column);
      if (columnIndex < 0 || parsed.length < 2) {
        return result;
      }
      const cells = parsed[1].split(",");
      cells[columnIndex] = value;
      parsed[1] = cells.join(",");
      result = `${parsed.join("\n")}\n`;
      return result;
    };

    const cases: Array<{ table: BackupTableName; column: string; value: string; pattern: RegExp }> =
      [
        {
          table: "classification_schemes",
          column: "portfolio_id",
          value: "missing-portfolio",
          pattern: /portfolio_id/,
        },
        {
          table: "classification_values",
          column: "scheme_id",
          value: "missing-scheme",
          pattern: /scheme_id/,
        },
        {
          table: "instruments",
          column: "portfolio_id",
          value: "missing-portfolio",
          pattern: /portfolio_id/,
        },
        {
          table: "instrument_classifications",
          column: "instrument_id",
          value: "missing-instrument",
          pattern: /instrument_id/,
        },
        {
          table: "instrument_attributes",
          column: "instrument_id",
          value: "missing-instrument",
          pattern: /instrument_id/,
        },
        {
          table: "portfolio_snapshots",
          column: "portfolio_id",
          value: "missing-portfolio",
          pattern: /portfolio_id/,
        },
        {
          table: "holding_lines",
          column: "snapshot_id",
          value: "missing-snapshot",
          pattern: /snapshot_id/,
        },
        {
          table: "holding_line_metrics",
          column: "holding_line_id",
          value: "missing-line",
          pattern: /holding_line_id/,
        },
        {
          table: "portfolio_snapshot_metrics",
          column: "snapshot_id",
          value: "missing-snapshot",
          pattern: /snapshot_id/,
        },
        {
          table: "target_allocation_weights",
          column: "portfolio_id",
          value: "missing-portfolio",
          pattern: /portfolio_id/,
        },
        {
          table: "target_portfolio_weights",
          column: "instrument_id",
          value: "missing-instrument",
          pattern: /instrument_id/,
        },
      ];

    for (const testCase of cases) {
      const brokenFiles = { ...files };
      if (!brokenFiles[testCase.table]?.includes("\n")) {
        continue;
      }
      // Ensure target_allocation_weights / target_portfolio_weights have a row when empty.
      if (
        (testCase.table === "target_allocation_weights" ||
          testCase.table === "target_portfolio_weights") &&
        brokenFiles[testCase.table].trim().split("\n").length < 2
      ) {
        const portfolioId = files.portfolios.split("\n")[1]?.split(",")[0] ?? "p1";
        const instrumentId = files.instruments.split("\n")[1]?.split(",")[0] ?? "i1";
        if (testCase.table === "target_allocation_weights") {
          brokenFiles.target_allocation_weights = serializeCsvTable(
            ["id", "portfolio_id", "scheme_code", "value_code", "target_ratio", "updated_at"],
            [["taw1", portfolioId, "asset_class", "equity", "0.5", "2026-01-01T00:00:00.000Z"]],
          );
        } else {
          brokenFiles.target_portfolio_weights = serializeCsvTable(
            ["id", "portfolio_id", "instrument_id", "target_ratio", "updated_at"],
            [["tpw1", portfolioId, instrumentId, "0.5", "2026-01-01T00:00:00.000Z"]],
          );
        }
      }

      if (
        testCase.table === "instrument_classifications" &&
        brokenFiles.instrument_classifications.trim().split("\n").length < 2
      ) {
        const instrumentId = files.instruments.split("\n")[1]?.split(",")[0] ?? "i1";
        const valueId = files.classification_values.split("\n")[1]?.split(",")[0] ?? "v1";
        brokenFiles.instrument_classifications = serializeCsvTable(
          ["instrument_id", "classification_value_id", "allocation_weight"],
          [[instrumentId, valueId, ""]],
        );
      }

      if (
        testCase.table === "instrument_attributes" &&
        brokenFiles.instrument_attributes.trim().split("\n").length < 2
      ) {
        const instrumentId = files.instruments.split("\n")[1]?.split(",")[0] ?? "i1";
        brokenFiles.instrument_attributes = serializeCsvTable(
          ["id", "instrument_id", "code", "integer_value", "real_value", "text_value"],
          [["attr1", instrumentId, "note", "", "", "x"]],
        );
      }

      if (
        testCase.table === "holding_line_metrics" &&
        brokenFiles.holding_line_metrics.trim().split("\n").length < 2
      ) {
        const holdingLineId = files.holding_lines.split("\n")[1]?.split(",")[0] ?? "hl1";
        brokenFiles.holding_line_metrics = serializeCsvTable(
          ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
          [["hlm1", holdingLineId, "note", "", "", "x"]],
        );
      }

      brokenFiles[testCase.table] = mutateFirstDataRow(
        brokenFiles[testCase.table],
        testCase.column,
        testCase.value,
      );

      const zipBuffer = createBackupZipBuffer(exported.manifest, brokenFiles);
      expect(() =>
        importPortfolioBackup(sqlite, zipBuffer, {
          mode: "merge",
          scope: { type: "portfolio", portfolioCode: "ideco" },
          dryRun: true,
        }),
      ).toThrow(testCase.pattern);
    }
  });

  it("allows empty foreign keys and inserts into an empty database", async () => {
    const source = setup();
    await seedPortfolio(source.db, "ideco");

    const exported = await exportPortfolioBackup(source.sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });

    const filesWithEmptyFk = { ...exported.files };
    filesWithEmptyFk.instrument_classifications = serializeCsvTable(
      ["instrument_id", "classification_value_id", "allocation_weight"],
      [["", "", ""]],
    );

    const emptyFkZip = createBackupZipBuffer(exported.manifest, filesWithEmptyFk);
    const emptyFkPreview = importPortfolioBackup(source.sqlite, emptyFkZip, {
      mode: "merge",
      scope: { type: "all" },
      dryRun: true,
    });
    expect("warnings" in emptyFkPreview).toBe(true);
    if ("warnings" in emptyFkPreview) {
      expect(emptyFkPreview.warnings[0]).toMatch(/全口座インポートとして取り込みます/);
    }

    const zipBuffer = createBackupZipBuffer(exported.manifest, exported.files);
    const target = setup();

    const preview = importPortfolioBackup(target.sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "all" },
      dryRun: true,
    });
    expect("warnings" in preview).toBe(true);

    const imported = importPortfolioBackup(target.sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "all" },
      dryRun: false,
    });
    expect(imported.ok).toBe(true);
    expect(imported.tables.find((table) => table.table === "portfolios")?.insert).toBe(1);
  });

  it("warns with unknown portfolio code when importing portfolio-scoped backup as all", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const zipBuffer = createBackupZipBuffer(
      { ...exported.manifest, portfolioCode: null },
      exported.files,
    );

    const preview = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "all" },
      dryRun: true,
    });

    expect("warnings" in preview).toBe(true);
    if ("warnings" in preview) {
      expect(preview.warnings[0]).toMatch(/不明/);
    }
  });

  it("replace mode clears all tables and remaps empty holding line ids", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");
    await seedPortfolio(db, "monex");

    const exported = await exportPortfolioBackup(sqlite, { type: "all" });
    const files = { ...exported.files };
    files.holding_lines = serializeCsvTable(
      [
        "id",
        "snapshot_id",
        "instrument_id",
        "account_id",
        "account_name",
        "sort_order",
        "quantity",
        "market_value_minor",
        "book_value_minor",
      ],
      [],
    );
    files.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [["m1", "missing-line", "x", "", "", ""]],
    );

    const zipBuffer = createBackupZipBuffer(exported.manifest, files);

    expect(() =>
      importPortfolioBackup(sqlite, zipBuffer, {
        mode: "replace",
        scope: { type: "all" },
        dryRun: false,
      }),
    ).toThrow(BackupImportError);

    // Valid empty holdings replace
    files.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [],
    );
    const validZip = createBackupZipBuffer(exported.manifest, files);
    const replaced = importPortfolioBackup(sqlite, validZip, {
      mode: "replace",
      scope: { type: "all" },
      dryRun: false,
    });
    expect(replaced.ok).toBe(true);

    const holdingCount = sqlite.prepare("SELECT COUNT(*) AS count FROM holding_lines").get() as {
      count: number;
    };
    expect(holdingCount.count).toBe(0);
  });

  it("replace for missing portfolio skips deletes when portfolio id is unresolved", async () => {
    const source = setup();
    await seedPortfolio(source.db, "ideco");

    const exported = await exportPortfolioBackup(source.sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const zipBuffer = createBackupZipBuffer(exported.manifest, exported.files);

    const target = setup();
    const imported = importPortfolioBackup(target.sqlite, zipBuffer, {
      mode: "replace",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: false,
    });

    expect(imported.ok).toBe(true);
    const count = target.sqlite.prepare("SELECT COUNT(*) AS count FROM portfolios").get() as {
      count: number;
    };
    expect(count.count).toBe(1);
  });

  it("rejects mismatched portfolio when backup portfolio code is null", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const zipBuffer = createBackupZipBuffer(
      { ...exported.manifest, portfolioCode: null },
      exported.files,
    );

    expect(() =>
      importPortfolioBackup(sqlite, zipBuffer, {
        mode: "merge",
        scope: { type: "portfolio", portfolioCode: "ideco" },
        dryRun: true,
      }),
    ).toThrow(/不明/);
  });

  it("remaps holding line metrics and short-circuits empty holding lines on merge", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const files = { ...exported.files };
    const holdingLineId = files.holding_lines.replace(/^\uFEFF/, "").split("\n")[1]?.split(",")[0];
    expect(holdingLineId).toBeTruthy();

    files.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [
        ["metric-1", holdingLineId!, "unrealized_pnl", "10", "", ""],
        ["metric-orphan", "", "note", "", "", "x"],
      ],
    );

    const existing = sqlite
      .prepare("SELECT id FROM holding_lines LIMIT 1")
      .get() as { id: string };

    sqlite.pragma("foreign_keys = OFF");
    sqlite.prepare("UPDATE holding_lines SET id = ? WHERE id = ?").run(
      "regen-holding-line-id",
      existing.id,
    );
    sqlite.pragma("foreign_keys = ON");

    const previewZip = createBackupZipBuffer(exported.manifest, files);
    const preview = importPortfolioBackup(sqlite, previewZip, {
      mode: "merge",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: true,
    });
    expect("tables" in preview).toBe(true);

    files.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [["metric-1", holdingLineId!, "unrealized_pnl", "10", "", ""]],
    );
    const zipBuffer = createBackupZipBuffer(exported.manifest, files);
    const imported = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: false,
    });
    expect(imported.ok).toBe(true);

    const metric = sqlite
      .prepare(
        `SELECT holding_line_id FROM holding_line_metrics WHERE code = 'unrealized_pnl' LIMIT 1`,
      )
      .get() as { holding_line_id: string };
    expect(metric.holding_line_id).toBe("regen-holding-line-id");

    const emptyHoldings = { ...exported.files };
    emptyHoldings.holding_lines = serializeCsvTable(
      [
        "id",
        "snapshot_id",
        "instrument_id",
        "account_id",
        "account_name",
        "sort_order",
        "quantity",
        "market_value_minor",
        "book_value_minor",
      ],
      [],
    );
    emptyHoldings.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [],
    );
    const emptyZip = createBackupZipBuffer(exported.manifest, emptyHoldings);
    const emptyPreview = importPortfolioBackup(sqlite, emptyZip, {
      mode: "merge",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: true,
    });
    expect("tables" in emptyPreview).toBe(true);

    const blankKeyHoldings = { ...exported.files };
    blankKeyHoldings.holding_lines = serializeCsvTable(
      [
        "id",
        "snapshot_id",
        "instrument_id",
        "account_id",
        "account_name",
        "sort_order",
        "quantity",
        "market_value_minor",
        "book_value_minor",
      ],
      [
        ["", "", "", "", "name", "", "1", "100", ""],
        ["orphan-hl", "", "", "", "name", "", "1", "100", ""],
      ],
    );
    blankKeyHoldings.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [],
    );
    const blankKeyZip = createBackupZipBuffer(exported.manifest, blankKeyHoldings);
    const blankKeyPreview = importPortfolioBackup(sqlite, blankKeyZip, {
      mode: "merge",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: true,
    });
    expect("tables" in blankKeyPreview).toBe(true);
  });

  it("merges holding lines with empty backup ids without remapping", async () => {
    const { sqlite, db } = setup();
    await seedPortfolio(db, "ideco");

    const exported = await exportPortfolioBackup(sqlite, {
      type: "portfolio",
      portfolioCode: "ideco",
    });
    const files = { ...exported.files };
    const lines = files.holding_lines.replace(/^\uFEFF/, "").trimEnd().split("\n");
    const headers = lines[0]?.split(",") ?? [];
    const idIndex = headers.indexOf("id");
    const cells = lines[1]?.split(",") ?? [];
    if (idIndex >= 0) {
      cells[idIndex] = "";
    }
    // Keep a unique business key so merge insert path is exercised on dry-run preview.
    const accountIndex = headers.indexOf("account_id");
    if (accountIndex >= 0) {
      cells[accountIndex] = "ideco:other";
    }
    lines[1] = cells.join(",");
    files.holding_lines = `${lines.join("\n")}\n`;
    files.holding_line_metrics = serializeCsvTable(
      ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
      [],
    );

    const zipBuffer = createBackupZipBuffer(exported.manifest, files);
    const preview = importPortfolioBackup(sqlite, zipBuffer, {
      mode: "merge",
      scope: { type: "portfolio", portfolioCode: "ideco" },
      dryRun: true,
    });

    expect("tables" in preview).toBe(true);
    const holdingPreview = preview.tables.find((table) => table.table === "holding_lines");
    expect((holdingPreview?.insert ?? 0) + (holdingPreview?.update ?? 0)).toBeGreaterThan(0);
  });
});
