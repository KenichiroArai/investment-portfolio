import { serializeCsvTable } from "@repo/shared";

import {
  BACKUP_MERGE_CONFLICT_COLUMNS,
  type BackupTableConfig,
} from "./backup-tables";

export function formatBackupCellValue(value: unknown): string {
  let result = "";

  if (value === null || value === undefined) {
    return result;
  }

  result = String(value);
  return result;
}

export function rowsToCsv(config: BackupTableConfig, rows: Record<string, unknown>[]): string {
  let result = "";
  const csvRows = rows.map((row) =>
    config.exportColumns.map((column) => formatBackupCellValue(row[column])),
  );
  result = serializeCsvTable(config.exportColumns, csvRows);
  return result;
}

export function parseBackupCellValue(
  column: string,
  rawValue: string,
  config: BackupTableConfig,
): string | number | null {
  let result: string | number | null = rawValue;
  const trimmed = rawValue.trim();

  if (trimmed === "") {
    if (config.nullableColumns.has(column)) {
      result = null;
      return result;
    }
    result = "";
    return result;
  }

  if (config.integerColumns.has(column)) {
    result = Number.parseInt(trimmed, 10);
    return result;
  }

  if (config.realColumns.has(column)) {
    result = Number.parseFloat(trimmed);
    return result;
  }

  result = trimmed;
  return result;
}

export function rowRecordToInsertValues(
  row: Record<string, string>,
  config: BackupTableConfig,
): Record<string, string | number | null> {
  let result: Record<string, string | number | null> = {};

  for (const column of config.columns) {
    result[column] = parseBackupCellValue(column, row[column] ?? "", config);
  }

  return result;
}

export function buildInsertStatement(tableName: string, columns: string[]): string {
  let result = "";
  const placeholders = columns.map(() => "?").join(", ");
  result = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  return result;
}

export function buildMergeUpsertStatement(
  tableName: string,
  config: BackupTableConfig,
): string {
  let result = "";
  const columns = config.columns;
  const placeholders = columns.map(() => "?").join(", ");
  const conflictColumns =
    BACKUP_MERGE_CONFLICT_COLUMNS[tableName as keyof typeof BACKUP_MERGE_CONFLICT_COLUMNS] ?? [
      "id",
    ];
  const conflictColumnSet = new Set(conflictColumns);
  // holding_lines は子テーブルが id を参照するため、業務キー衝突時も id は既存行を維持する。
  // （import 側で backup id → 既存 id へ remap 済みである前提）
  const preserveIdOnConflict = tableName === "holding_lines";
  const updateAssignments = columns
    .filter((column) => {
      if (conflictColumnSet.has(column)) {
        return false;
      }
      if (preserveIdOnConflict && column === "id") {
        return false;
      }
      return true;
    })
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");

  result = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})
    ON CONFLICT(${conflictColumns.join(", ")}) DO UPDATE SET ${updateAssignments}`;
  return result;
}
