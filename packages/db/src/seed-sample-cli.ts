import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { clearSampleData, seedSampleData } from "./sample-data";

const packageDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(packageDir, "../drizzle");

async function main() {
  const command = process.argv[2];
  if (command !== "on" && command !== "off") {
    console.error("Usage: tsx src/seed-sample-cli.ts <on|off>");
    process.exit(1);
  }

  const useSampleDb = process.argv.includes("--sample");
  const databasePath = resolveDatabasePath({ sample: useSampleDb });
  mkdirSync(dirname(databasePath), { recursive: true });
  const { sqlite, db } = createDb(databasePath);
  migrate(db, { migrationsFolder });

  if (command === "on") {
    const outcome = await seedSampleData(db);
    if (outcome.status === "seeded") {
      console.log(`Sample data seeded: ${databasePath}`);
    }
    if (outcome.status === "already_seeded") {
      console.log(`Sample data already present: ${databasePath}`);
    }
    if (outcome.status === "skipped") {
      console.error(
        "Cannot seed: portfolio code 'ideco' exists with non-sample data. Use a different DATABASE_PATH or remove it first.",
      );
      sqlite.close();
      process.exit(1);
    }
  }

  if (command === "off") {
    const outcome = await clearSampleData(db);
    if (outcome.status === "cleared") {
      console.log(`Sample data removed: ${databasePath}`);
    }
    if (outcome.status === "not_present") {
      console.log(`No sample data in: ${databasePath}`);
    }
  }

  sqlite.close();
}

void main();
