import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { createDb } from "./client";

const packageDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(packageDir, "../drizzle");

export function createTestDb() {
  const path = join(tmpdir(), `portfolio-test-${Date.now()}-${Math.random()}.db`);
  mkdirSync(dirname(path), { recursive: true });
  const { sqlite, db } = createDb(path);
  migrate(db, { migrationsFolder });
  const result = { sqlite, db, path };
  return result;
}
