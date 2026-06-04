import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type AppDatabase } from "@repo/db";

const apiDir = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(apiDir, "../../../data/portfolio.db");
const migrationsFolder = resolve(apiDir, "../../../packages/db/drizzle");

let cached: { db: AppDatabase; databasePath: string } | null = null;

export function getDatabase(): AppDatabase {
  if (cached) {
    const result = cached.db;
    return result;
  }

  const databasePath = process.env.DATABASE_PATH ?? defaultDbPath;
  mkdirSync(dirname(databasePath), { recursive: true });
  const { sqlite, db } = createDb(databasePath);
  migrate(db, { migrationsFolder });
  cached = { db, databasePath };
  const result = db;
  return result;
}
