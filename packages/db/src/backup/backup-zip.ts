import { unzipSync, zipSync } from "fflate";

import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLE_NAMES,
  type BackupManifest,
  type BackupTableName,
} from "@repo/shared";

export function formatBackupFilenameTimestamp(date = new Date()): string {
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
  const [datePart, timePart] = formatted.split(" ");
  result = `${datePart.replace(/-/g, "")}-${timePart.replace(/:/g, "")}`;
  return result;
}

export function buildBackupZipFilename(scope: "all" | "portfolio", portfolioCode?: string): string {
  let result = "";
  const timestamp = formatBackupFilenameTimestamp();

  if (scope === "portfolio" && portfolioCode) {
    result = `portfolio-${portfolioCode}-export-${timestamp}.zip`;
    return result;
  }

  result = `portfolio-db-export-${timestamp}.zip`;
  return result;
}

export function createBackupZipBuffer(
  manifest: BackupManifest,
  files: Record<BackupTableName, string>,
): Buffer {
  let result = Buffer.alloc(0);
  const entries: Record<string, Uint8Array> = {
    "manifest.json": new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
  };

  for (const tableName of BACKUP_TABLE_NAMES) {
    entries[`${tableName}.csv`] = new TextEncoder().encode(files[tableName]);
  }

  const zipped = zipSync(entries, { level: 6 });
  result = Buffer.from(zipped);
  return result;
}

export function extractBackupZipBuffer(zipBuffer: Buffer): {
  manifest: BackupManifest;
  files: Partial<Record<BackupTableName, string>>;
} {
  let result: {
    manifest: BackupManifest;
    files: Partial<Record<BackupTableName, string>>;
  } = {
    manifest: {
      formatVersion: 0,
      schemaVersion: "",
      exportedAt: "",
      scope: "all",
      portfolioCode: null,
      rowCounts: {},
    },
    files: {},
  };

  const unzipped = unzipSync(new Uint8Array(zipBuffer));
  const decoder = new TextDecoder("utf-8");

  for (const [name, bytes] of Object.entries(unzipped)) {
    const normalizedName = name.replace(/\\/g, "/").split("/").pop() ?? name;
    const content = decoder.decode(bytes);

    if (normalizedName === "manifest.json") {
      result.manifest = JSON.parse(content) as BackupManifest;
      continue;
    }

    if (!normalizedName.endsWith(".csv")) {
      continue;
    }

    const tableName = normalizedName.slice(0, -4) as BackupTableName;
    if (BACKUP_TABLE_NAMES.includes(tableName)) {
      result.files[tableName] = content;
    }
  }

  return result;
}
