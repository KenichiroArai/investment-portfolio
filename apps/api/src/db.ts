import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, resolveDatabasePath, type AppDatabase } from "@repo/db";

const apiDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(apiDir, "../../../packages/db/drizzle");

let cached: {
  db: AppDatabase;
  databasePath: string;
  sqlite: ReturnType<typeof createDb>["sqlite"];
} | null = null;

export async function initDatabase(): Promise<AppDatabase> {
  if (cached) {
    const result = cached.db;
    return result;
  }

  const databasePath = resolveDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  const { sqlite, db } = createDb(databasePath);
  migrate(db, { migrationsFolder });

  cached = { db, databasePath, sqlite };
  const result = db;
  return result;
}

export function getDatabase(): AppDatabase {
  if (!cached) {
    throw new Error("Database not initialized. Call initDatabase() before handling requests.");
  }
  const result = cached.db;
  return result;
}

export function getDatabasePath(): string | null {
  if (!cached) {
    const result: string | null = null;
    return result;
  }
  const result = cached.databasePath;
  return result;
}

export function resetDatabaseCacheForTests(): void {
  cached = null;
}
