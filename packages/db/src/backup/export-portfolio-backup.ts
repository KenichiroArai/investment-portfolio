import type Database from "better-sqlite3";

import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLE_NAMES,
  type BackupManifest,
  type BackupTableName,
} from "@repo/shared";

import { buildBackupZipFilename } from "./backup-zip";
import { BACKUP_TABLE_CONFIGS, buildBackupExportQuery } from "./backup-tables";
import { rowsToCsv } from "./csv-table-io";

export type BackupExportScope =
  | {
      type: "all";
    }
  | {
      type: "portfolio";
      portfolioCode: string;
    };

export type BackupExportResult = {
  manifest: BackupManifest;
  files: Record<BackupTableName, string>;
  filename: string;
};

function formatExportedAt(date: Date): string {
  let result = "";
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const formatted = formatter.format(date);
  result = `${formatted.replace(" ", "T")}+09:00`;
  return result;
}

export async function exportPortfolioBackup(
  sqlite: Database.Database,
  scope: BackupExportScope,
): Promise<BackupExportResult> {
  let result: BackupExportResult = {
    manifest: {
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: "",
      scope: "all",
      portfolioCode: null,
      rowCounts: {},
    },
    files: {} as Record<BackupTableName, string>,
    filename: "",
  };

  if (scope.type === "portfolio") {
    const portfolio = sqlite
      .prepare("SELECT id FROM portfolios WHERE code = ?")
      .get(scope.portfolioCode) as { id: string } | undefined;

    if (!portfolio) {
      throw new BackupExportError(`口座が見つかりません: ${scope.portfolioCode}`);
    }
  }

  const exportedAt = formatExportedAt(new Date());
  const rowCounts: Record<string, number> = {};
  const files = {} as Record<BackupTableName, string>;

  for (const tableName of BACKUP_TABLE_NAMES) {
    const config = BACKUP_TABLE_CONFIGS[tableName];
    const query = buildBackupExportQuery(tableName, scope);
    const rows = sqlite.prepare(query.sql).all(...query.params) as Record<string, unknown>[];
    rowCounts[tableName] = rows.length;
    files[tableName] = rowsToCsv(config, rows);
  }

  result = {
    manifest: {
      formatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt,
      scope: scope.type,
      portfolioCode: scope.type === "portfolio" ? scope.portfolioCode : null,
      rowCounts,
    },
    files,
    filename: buildBackupZipFilename(
      scope.type,
      scope.type === "portfolio" ? scope.portfolioCode : undefined,
    ),
  };
  return result;
}

export class BackupExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackupExportError";
  }
}
