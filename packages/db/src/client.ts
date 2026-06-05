import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema/index";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export function createDb(databasePath: string): {
  sqlite: Database.Database;
  db: AppDatabase;
} {
  let result!: {
    sqlite: Database.Database;
    db: AppDatabase;
  };

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  result = { sqlite, db };
  return result;
}
