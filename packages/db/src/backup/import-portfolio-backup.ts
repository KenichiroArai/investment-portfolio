import type Database from "better-sqlite3";

import {
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLE_NAMES,
  isBackupSchemaVersionCompatible,
  parseCsvTable,
  type BackupImportMode,
  type BackupImportPreview,
  type BackupImportResult,
  type BackupManifest,
  type BackupTableName,
} from "@repo/shared";

import {
  BACKUP_IMPORT_ORDER,
  BACKUP_TABLE_CONFIGS,
  buildBackupDeleteStatements,
  buildBackupExportQuery,
} from "./backup-tables";
import { extractBackupZipBuffer } from "./backup-zip";
import {
  buildInsertStatement,
  buildMergeUpsertStatement,
  rowRecordToInsertValues,
} from "./csv-table-io";

export type BackupImportScope =
  | {
      type: "all";
    }
  | {
      type: "portfolio";
      portfolioCode: string;
    };

export type BackupImportOptions = {
  mode: BackupImportMode;
  scope: BackupImportScope;
  dryRun?: boolean;
};

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupImportError";
  }
}

function validateManifest(manifest: BackupManifest, options: BackupImportOptions): string[] {
  let result: string[] = [];

  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    result.push(`未対応の formatVersion です: ${manifest.formatVersion}`);
  }

  if (!isBackupSchemaVersionCompatible(manifest.schemaVersion)) {
    result.push(`未対応の schemaVersion です: ${manifest.schemaVersion}`);
  }

  if (options.scope.type === "portfolio") {
    if (manifest.scope !== "portfolio") {
      result.push("全口座バックアップは口座単位のインポートでは利用できません。");
      return result;
    }

    if (manifest.portfolioCode !== options.scope.portfolioCode) {
      result.push(
        `バックアップの口座コード (${manifest.portfolioCode ?? "不明"}) と対象口座 (${options.scope.portfolioCode}) が一致しません。`,
      );
    }
  }

  return result;
}

function validateRequiredFiles(files: Partial<Record<BackupTableName, string>>): string[] {
  let result: string[] = [];

  for (const tableName of BACKUP_TABLE_NAMES) {
    if (!files[tableName]) {
      result.push(`必須ファイルがありません: ${tableName}.csv`);
    }
  }

  return result;
}

function validateHeaders(tableName: BackupTableName, headers: string[]): string[] {
  let result: string[] = [];
  const config = BACKUP_TABLE_CONFIGS[tableName];
  const headerSet = new Set(headers);

  for (const column of config.columns) {
    if (!headerSet.has(column)) {
      result.push(`${tableName}.csv に必須列がありません: ${column}`);
    }
  }

  return result;
}

function rowKey(tableName: BackupTableName, row: Record<string, string>): string {
  let result = "";
  const config = BACKUP_TABLE_CONFIGS[tableName];

  if (tableName === "instrument_classifications") {
    result = `${row.instrument_id}::${row.classification_value_id}`;
    return result;
  }

  if (config.hasId) {
    result = row.id;
    return result;
  }

  result = JSON.stringify(row);
  return result;
}

function fetchExistingRows(
  sqlite: Database.Database,
  tableName: BackupTableName,
  scope: BackupImportScope,
): Record<string, string>[] {
  let result: Record<string, string>[] = [];
  const exportScope =
    scope.type === "all"
      ? { type: "all" as const }
      : { type: "portfolio" as const, portfolioCode: scope.portfolioCode };
  const query = buildBackupExportQuery(tableName, exportScope);
  const rows = sqlite.prepare(query.sql).all(...query.params) as Record<string, unknown>[];
  const config = BACKUP_TABLE_CONFIGS[tableName];

  for (const row of rows) {
    const record: Record<string, string> = {};
    for (const column of config.columns) {
      const value = row[column];
      record[column] = value === null || value === undefined ? "" : String(value);
    }
    result.push(record);
  }

  return result;
}

function buildTablePreview(
  tableName: BackupTableName,
  importRows: Record<string, string>[],
  existingRows: Record<string, string>[],
  mode: BackupImportMode,
): { table: string; insert: number; update: number; delete: number } {
  let result = { table: tableName, insert: 0, update: 0, delete: 0 };
  const existingByKey = new Map(existingRows.map((row) => [rowKey(tableName, row), row]));
  const importKeys = new Set<string>();

  for (const row of importRows) {
    const key = rowKey(tableName, row);
    importKeys.add(key);
    const existing = existingByKey.get(key);

    if (!existing) {
      result.insert += 1;
      continue;
    }

    const config = BACKUP_TABLE_CONFIGS[tableName];
    let changed = false;

    for (const column of config.columns) {
      const importValue = (row[column] ?? "").trim();
      const existingValue = (existing[column] ?? "").trim();
      if (importValue !== existingValue) {
        changed = true;
        break;
      }
    }

    if (changed) {
      result.update += 1;
    }
  }

  if (mode === "replace") {
    for (const existing of existingRows) {
      const key = rowKey(tableName, existing);
      if (!importKeys.has(key)) {
        result.delete += 1;
      }
    }
  }

  return result;
}

function validateForeignKeys(
  tableName: BackupTableName,
  importRows: Record<string, string>[],
  importedData: Partial<Record<BackupTableName, Record<string, string>[]>>,
): string[] {
  let result: string[] = [];

  const requireReference = (
    label: string,
    values: Set<string>,
    references: Set<string>,
  ) => {
    for (const value of values) {
      if (value === "") {
        continue;
      }
      if (!references.has(value)) {
        result.push(`${tableName}: 参照先 ${label} が見つかりません (${value})`);
      }
    }
  };

  if (tableName === "classification_schemes") {
    const portfolioIds = new Set((importedData.portfolios ?? []).map((row) => row.id));
    requireReference(
      "portfolio_id",
      new Set(importRows.map((row) => row.portfolio_id)),
      portfolioIds,
    );
  }

  if (tableName === "classification_values") {
    const schemeIds = new Set((importedData.classification_schemes ?? []).map((row) => row.id));
    requireReference(
      "scheme_id",
      new Set(importRows.map((row) => row.scheme_id)),
      schemeIds,
    );
  }

  if (tableName === "instruments") {
    const portfolioIds = new Set((importedData.portfolios ?? []).map((row) => row.id));
    requireReference(
      "portfolio_id",
      new Set(importRows.map((row) => row.portfolio_id)),
      portfolioIds,
    );
  }

  if (tableName === "instrument_classifications") {
    const instrumentIds = new Set((importedData.instruments ?? []).map((row) => row.id));
    const valueIds = new Set((importedData.classification_values ?? []).map((row) => row.id));
    requireReference(
      "instrument_id",
      new Set(importRows.map((row) => row.instrument_id)),
      instrumentIds,
    );
    requireReference(
      "classification_value_id",
      new Set(importRows.map((row) => row.classification_value_id)),
      valueIds,
    );
  }

  if (tableName === "instrument_attributes") {
    const instrumentIds = new Set((importedData.instruments ?? []).map((row) => row.id));
    requireReference(
      "instrument_id",
      new Set(importRows.map((row) => row.instrument_id)),
      instrumentIds,
    );
  }

  if (tableName === "portfolio_snapshots") {
    const portfolioIds = new Set((importedData.portfolios ?? []).map((row) => row.id));
    requireReference(
      "portfolio_id",
      new Set(importRows.map((row) => row.portfolio_id)),
      portfolioIds,
    );
  }

  if (tableName === "holding_lines") {
    const snapshotIds = new Set((importedData.portfolio_snapshots ?? []).map((row) => row.id));
    const instrumentIds = new Set((importedData.instruments ?? []).map((row) => row.id));
    requireReference(
      "snapshot_id",
      new Set(importRows.map((row) => row.snapshot_id)),
      snapshotIds,
    );
    requireReference(
      "instrument_id",
      new Set(importRows.map((row) => row.instrument_id)),
      instrumentIds,
    );
  }

  if (tableName === "holding_line_metrics") {
    const holdingLineIds = new Set((importedData.holding_lines ?? []).map((row) => row.id));
    requireReference(
      "holding_line_id",
      new Set(importRows.map((row) => row.holding_line_id)),
      holdingLineIds,
    );
  }

  if (tableName === "portfolio_snapshot_metrics") {
    const snapshotIds = new Set((importedData.portfolio_snapshots ?? []).map((row) => row.id));
    requireReference(
      "snapshot_id",
      new Set(importRows.map((row) => row.snapshot_id)),
      snapshotIds,
    );
  }

  if (tableName === "target_allocation_weights" || tableName === "target_portfolio_weights") {
    const portfolioIds = new Set((importedData.portfolios ?? []).map((row) => row.id));
    requireReference(
      "portfolio_id",
      new Set(importRows.map((row) => row.portfolio_id)),
      portfolioIds,
    );
  }

  if (tableName === "target_portfolio_weights") {
    const instrumentIds = new Set((importedData.instruments ?? []).map((row) => row.id));
    requireReference(
      "instrument_id",
      new Set(importRows.map((row) => row.instrument_id)),
      instrumentIds,
    );
  }

  return result;
}

function insertRows(
  sqlite: Database.Database,
  tableName: BackupTableName,
  rows: Record<string, string>[],
  mode: BackupImportMode,
  scope: BackupImportScope,
): void {
  let result: void = undefined;
  const config = BACKUP_TABLE_CONFIGS[tableName];
  const useUpsert =
    mode === "merge" || (tableName === "portfolios" && scope.type === "portfolio");
  const statement = sqlite.prepare(
    useUpsert
      ? buildMergeUpsertStatement(tableName, config)
      : buildInsertStatement(tableName, config.columns),
  );

  for (const row of rows) {
    const values = rowRecordToInsertValues(row, config);
    const params = config.columns.map((column) => values[column] ?? null);
    statement.run(...params);
  }

  return result;
}

function resolvePortfolioId(sqlite: Database.Database, portfolioCode: string): string | null {
  let result: string | null = null;
  const row = sqlite
    .prepare("SELECT id FROM portfolios WHERE code = ?")
    .get(portfolioCode) as { id: string } | undefined;

  if (row) {
    result = row.id;
  }

  return result;
}

function resolveEffectiveScope(
  options: BackupImportOptions,
  manifest: BackupManifest,
): BackupImportScope {
  let result: BackupImportScope = options.scope;

  if (options.scope.type === "all" && manifest.scope === "portfolio" && manifest.portfolioCode) {
    result = { type: "portfolio", portfolioCode: manifest.portfolioCode };
  }

  return result;
}

export function importPortfolioBackup(
  sqlite: Database.Database,
  zipBuffer: Buffer,
  options: BackupImportOptions,
): BackupImportPreview | BackupImportResult {
  let result: BackupImportPreview | BackupImportResult = {
    manifest: {
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: "",
      exportedAt: "",
      scope: "all",
      portfolioCode: null,
      rowCounts: {},
    },
    tables: [],
    warnings: [],
  };

  const extracted = extractBackupZipBuffer(zipBuffer);
  const manifest = extracted.manifest;
  const warnings = [
    ...validateManifest(manifest, options),
    ...validateRequiredFiles(extracted.files),
  ];

  if (warnings.length > 0) {
    throw new BackupImportError(warnings.join(" "));
  }

  const parsedTables = {} as Record<BackupTableName, Record<string, string>[]>;

  for (const tableName of BACKUP_TABLE_NAMES) {
    const content = extracted.files[tableName];
    if (!content) {
      continue;
    }

    const parsed = parseCsvTable(content);
    warnings.push(...validateHeaders(tableName, parsed.headers));
    parsedTables[tableName] = parsed.rows;
  }

  for (const tableName of BACKUP_IMPORT_ORDER) {
    warnings.push(...validateForeignKeys(tableName, parsedTables[tableName], parsedTables));
  }

  if (warnings.length > 0) {
    throw new BackupImportError(warnings.join(" "));
  }

  const effectiveScope = resolveEffectiveScope(options, manifest);

  const tablePreviews = BACKUP_TABLE_NAMES.map((tableName) =>
    buildTablePreview(
      tableName,
      parsedTables[tableName],
      fetchExistingRows(sqlite, tableName, effectiveScope),
      options.mode,
    ),
  );

  const preview: BackupImportPreview = {
    manifest,
    tables: tablePreviews,
    warnings: [],
  };

  if (options.scope.type === "portfolio" && manifest.scope === "portfolio") {
    preview.warnings = [];
  }

  if (manifest.scope === "portfolio" && options.scope.type === "all") {
    preview.warnings.push(
      `口座単位のバックアップ (${manifest.portfolioCode ?? "不明"}) を全口座インポートとして取り込みます。`,
    );
  }

  if (options.dryRun) {
    result = preview;
    return result;
  }

  const portfolioId =
    effectiveScope.type === "portfolio"
      ? resolvePortfolioId(sqlite, effectiveScope.portfolioCode)
      : null;

  const runImport = sqlite.transaction(() => {
    let txResult: void = undefined;

    if (options.mode === "replace") {
      const deleteScope =
        effectiveScope.type === "all"
          ? { type: "all" as const }
          : { type: "portfolio" as const, portfolioCode: effectiveScope.portfolioCode };
      const deleteStatements = buildBackupDeleteStatements(deleteScope, portfolioId);

      for (const statement of deleteStatements) {
        sqlite.prepare(statement.sql).run(...statement.params);
      }
    }

    for (const tableName of BACKUP_IMPORT_ORDER) {
      insertRows(sqlite, tableName, parsedTables[tableName], options.mode, effectiveScope);
    }

    return txResult;
  });

  runImport();

  result = {
    ok: true,
    tables: tablePreviews,
  };
  return result;
}
