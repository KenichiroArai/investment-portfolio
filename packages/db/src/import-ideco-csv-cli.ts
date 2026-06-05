import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { IdecoKakeiboCsvError } from "@repo/shared";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { importIdecoKakeiboCsv } from "./import-ideco-csv";

const packageDir = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(packageDir, "../drizzle");

function printUsage(): void {
  let result: void = undefined;
  console.error("Usage: tsx src/import-ideco-csv-cli.ts <path-to-csv>");
  return result;
}

async function main() {
  let result: void = undefined;

  const csvPath = process.argv[2];
  if (!csvPath) {
    printUsage();
    process.exit(1);
  }

  const databasePath = resolveDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  const { sqlite, db } = createDb(databasePath);
  migrate(db, { migrationsFolder });

  let csvContent = "";
  try {
    csvContent = readFileSync(csvPath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`CSV を読み込めません: ${csvPath} (${message})`);
    sqlite.close();
    process.exit(1);
  }

  try {
    const outcome = await importIdecoKakeiboCsv(db, csvContent);
    if (!outcome) {
      console.error("iDeCo データの投入に失敗しました。");
      sqlite.close();
      process.exit(1);
    }

    console.log(`Database: ${databasePath}`);
    console.log(`As of: ${outcome.asOfDate}`);
    console.log(`Lines: ${outcome.lineCount}`);
    console.log(
      `Instruments: created ${outcome.createdInstruments}, reused ${outcome.reusedInstruments}`,
    );
  } catch (error) {
    if (error instanceof IdecoKakeiboCsvError) {
      console.error(`CSV エラー: ${error.message}`);
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`投入エラー: ${message}`);
    }
    sqlite.close();
    process.exit(1);
  }

  sqlite.close();
  return result;
}

void main();
