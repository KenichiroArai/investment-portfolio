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
  let result!: {
    sqlite: ReturnType<typeof createDb>["sqlite"];
    db: ReturnType<typeof createDb>["db"];
    path: string;
  };

  const path = join(tmpdir(), `portfolio-test-${Date.now()}-${Math.random()}.db`);
  mkdirSync(dirname(path), { recursive: true });
  const { sqlite, db } = createDb(path);
  migrate(db, { migrationsFolder });
  result = { sqlite, db, path };
  return result;
}
