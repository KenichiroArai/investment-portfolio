import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { listPortfolios } from "./repositories/portfolios";
import { getCurrentSnapshot } from "./repositories/snapshots";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");
const docsDataRoot = resolve(repoRoot, "docs/data/portfolios");
const databasePath = resolveDatabasePath();

async function main() {
  let result: void = undefined;

  const { sqlite, db } = createDb(databasePath);
  const portfolios = await listPortfolios(db);
  let exported = 0;

  for (const portfolio of portfolios) {
    const snapshot = await getCurrentSnapshot(db, portfolio.code);
    const outDir = resolve(docsDataRoot, portfolio.code);
    const outPath = resolve(outDir, "current.json");

    if (!snapshot) {
      try {
        rmSync(outPath, { force: true });
      } catch {
        // ignore missing file
      }
      continue;
    }

    mkdirSync(outDir, { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    exported += 1;
    console.log(`Exported: ${outPath}`);
  }

  sqlite.close();
  console.log(`Done. ${exported} snapshot(s) written under docs/data/portfolios/`);

  return result;
}

void main();
