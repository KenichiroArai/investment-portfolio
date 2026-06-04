import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createDb } from "./client";

const packageDir = dirname(fileURLToPath(import.meta.url));
const defaultDbPath = resolve(packageDir, "../../../data/portfolio.db");
const databasePath = process.env.DATABASE_PATH ?? defaultDbPath;
const migrationsFolder = resolve(packageDir, "../drizzle");

mkdirSync(dirname(databasePath), { recursive: true });

const { sqlite, db } = createDb(databasePath);
migrate(db, { migrationsFolder });
sqlite.close();

console.log(`Migrated: ${databasePath}`);
