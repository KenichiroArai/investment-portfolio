import { z } from "zod";

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_SCHEMA_VERSION = "0010";

export const BACKUP_TABLE_NAMES = [
  "portfolios",
  "classification_schemes",
  "classification_values",
  "instruments",
  "instrument_classifications",
  "instrument_attributes",
  "portfolio_snapshots",
  "holding_lines",
  "holding_line_metrics",
  "portfolio_snapshot_metrics",
  "target_allocation_weights",
  "target_portfolio_weights",
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_NAMES)[number];

export const backupScopeSchema = z.enum(["all", "portfolio"]);

export const backupImportModeSchema = z.enum(["merge", "replace"]);

export type BackupImportMode = z.infer<typeof backupImportModeSchema>;

export const backupManifestSchema = z.object({
  formatVersion: z.number().int(),
  schemaVersion: z.string().min(1),
  exportedAt: z.string().min(1),
  scope: backupScopeSchema,
  portfolioCode: z.string().nullable(),
  rowCounts: z.record(z.string(), z.number().int().nonnegative()),
});

export type BackupManifest = z.infer<typeof backupManifestSchema>;

export const backupTablePreviewSchema = z.object({
  table: z.string(),
  insert: z.number().int().nonnegative(),
  update: z.number().int().nonnegative(),
  delete: z.number().int().nonnegative(),
});

export const backupImportPreviewSchema = z.object({
  manifest: backupManifestSchema,
  tables: z.array(backupTablePreviewSchema),
  warnings: z.array(z.string()),
});

export type BackupImportPreview = z.infer<typeof backupImportPreviewSchema>;

export const backupImportResultSchema = z.object({
  ok: z.literal(true),
  tables: z.array(backupTablePreviewSchema),
});

export type BackupImportResult = z.infer<typeof backupImportResultSchema>;

export function isBackupSchemaVersionCompatible(schemaVersion: string): boolean {
  let result = schemaVersion === BACKUP_SCHEMA_VERSION;
  return result;
}
