import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { IdecoCsvError, SnapshotValidationError } from "@repo/shared";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { importIdecoData } from "./import-ideco-data";
import { readCsvText } from "./read-csv-text";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");
const migrationsFolder = resolve(packageDir, "../drizzle");

function resolveImportDirectory(dirPath: string): string {
  let result = resolve(dirPath);

  const candidates = [resolve(dirPath), resolve(repoRoot, dirPath)];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      result = candidate;
      return result;
    }
  }

  return result;
}

const IDECO_CSV_FILES = {
  productTypes: "商品タイプ.csv",
  analysis: "分析.csv",
  instruments: "銘柄の情報.csv",
  holdings: "明細.csv",
  generic: "汎用.csv",
} as const;

function printUsage(): void {
  let result: void = undefined;
  console.error("Usage: tsx src/import-ideco-csv-cli.ts <path-to-ideco-directory>");
  return result;
}

function readRequiredCsv(dirPath: string, fileName: string): string {
  let result = "";

  const filePath = join(dirPath, fileName);
  if (!existsSync(filePath)) {
    throw new IdecoCsvError(`CSV が見つかりません: ${filePath}`);
  }

  result = readCsvText(filePath);
  return result;
}

async function main() {
  let result: void = undefined;

  const dirPath = process.argv[2];
  if (!dirPath) {
    printUsage();
    process.exit(1);
  }

  const resolvedDir = resolveImportDirectory(dirPath);
  if (!existsSync(resolvedDir)) {
    console.error(`ディレクトリが見つかりません: ${resolvedDir}`);
    process.exit(1);
  }

  const databasePath = resolveDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  const { sqlite, db } = createDb(databasePath);
  migrate(db, { migrationsFolder });

  try {
    const outcome = await importIdecoData(db, {
      productTypesCsv: readRequiredCsv(resolvedDir, IDECO_CSV_FILES.productTypes),
      analysisCsv: readRequiredCsv(resolvedDir, IDECO_CSV_FILES.analysis),
      instrumentsCsv: readRequiredCsv(resolvedDir, IDECO_CSV_FILES.instruments),
      holdingsCsv: readRequiredCsv(resolvedDir, IDECO_CSV_FILES.holdings),
      genericCsv: readRequiredCsv(resolvedDir, IDECO_CSV_FILES.generic),
    });
    if (!outcome) {
      console.error("iDeCo データの投入に失敗しました。");
      sqlite.close();
      process.exit(1);
    }

    console.log(`Database: ${databasePath}`);
    console.log(`As of: ${outcome.asOfDate}`);
    console.log(`Holdings: ${outcome.lineCount}`);
    console.log(`Instruments: ${outcome.instrumentCount}`);
    console.log(
      `Instrument upsert: created ${outcome.createdInstruments}, reused ${outcome.reusedInstruments}`,
    );
  } catch (error) {
    if (error instanceof IdecoCsvError) {
      console.error(`CSV エラー: ${error.message}`);
    } else if (error instanceof SnapshotValidationError) {
      console.error(`検証エラー: ${error.message}`);
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
