import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { importMonexData } from "./import-monex-data";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");

function resolveImportDirectory(directoryArg: string): string {
  let result = resolve(directoryArg);

  if (existsSync(result)) {
    return result;
  }

  result = resolve(repoRoot, directoryArg);
  return result;
}

async function main() {
  let result: void = undefined;

  const directoryArg = process.argv[2];
  if (!directoryArg) {
    console.error("Usage: tsx src/import-monex-csv-cli.ts <path-to-monex-directory>");
    process.exit(1);
  }

  const directory = resolveImportDirectory(directoryArg);
  const databasePath = resolveDatabasePath();
  const { sqlite, db } = createDb(databasePath);

  try {
    const outcome = await importMonexData(db, { directory });
    console.log(
      JSON.stringify(
        {
          ok: true,
          asOfDate: outcome.asOfDate,
          lineCount: outcome.lineCount,
          instrumentCount: outcome.instrumentCount,
          createdInstruments: outcome.createdInstruments,
        },
        null,
        2,
      ),
    );
  } finally {
    sqlite.close();
  }

  return result;
}

void main();
