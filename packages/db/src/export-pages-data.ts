import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSnapshotTrends } from "@repo/shared";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import { listPortfolios } from "./repositories/portfolios";
import {
  getCurrentSnapshot,
  getSnapshotByDate,
  listSnapshotDates,
} from "./repositories/snapshots";

const packageDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(packageDir, "../../..");
const docsDataRoot = resolve(repoRoot, "docs/data/portfolios");
const docsPortfoliosIndexPath = resolve(repoRoot, "docs/data/portfolios.json");
const portfolioCatalogPath = resolve(
  repoRoot,
  "apps/web/src/lib/portfolio-catalog.ts",
);
const databasePath = resolveDatabasePath();

async function main() {
  let result: void = undefined;

  const { sqlite, db } = createDb(databasePath);
  const portfolios = await listPortfolios(db);
  let exported = 0;

  writeFileSync(
    docsPortfoliosIndexPath,
    `${JSON.stringify(
      portfolios.map((portfolio) => ({
        id: portfolio.id,
        code: portfolio.code,
        name: portfolio.name,
        kind: portfolio.kind,
      })),
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Exported: ${docsPortfoliosIndexPath}`);

  const catalogEntries = portfolios.map((portfolio) => ({
    id: portfolio.id,
    code: portfolio.code,
    name: portfolio.name,
    kind: portfolio.kind,
  }));
  const catalogSource = `import type { PortfolioDto } from "@repo/shared";

export const STATIC_PORTFOLIOS: PortfolioDto[] = ${JSON.stringify(catalogEntries, null, 2)};

export function generatePortfolioStaticParams(): { code: string }[] {
  let result: { code: string }[] = [];

  for (const portfolio of STATIC_PORTFOLIOS) {
    result.push({ code: portfolio.code });
  }

  return result;
}

export function findPortfolioByCode(code: string): PortfolioDto | null {
  let result: PortfolioDto | null = null;

  const portfolio = STATIC_PORTFOLIOS.find((item) => item.code === code);
  if (!portfolio) {
    return result;
  }

  result = portfolio;
  return result;
}
`;
  writeFileSync(portfolioCatalogPath, `${catalogSource}\n`, "utf8");
  console.log(`Exported: ${portfolioCatalogPath}`);

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

    const dates = await listSnapshotDates(db, portfolio.code);
    const snapshotsDir = resolve(outDir, "snapshots");
    mkdirSync(snapshotsDir, { recursive: true });

    writeFileSync(
      resolve(outDir, "snapshots-index.json"),
      `${JSON.stringify(
        {
          portfolioCode: portfolio.code,
          dates,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`Exported: ${resolve(outDir, "snapshots-index.json")}`);

    const snapshotsForTrends = [];
    for (const dateItem of dates) {
      const datedSnapshot = await getSnapshotByDate(
        db,
        portfolio.code,
        dateItem.asOfDate,
      );
      if (!datedSnapshot) {
        continue;
      }
      writeFileSync(
        resolve(snapshotsDir, `${dateItem.asOfDate}.json`),
        `${JSON.stringify(datedSnapshot, null, 2)}\n`,
        "utf8",
      );
      snapshotsForTrends.push(datedSnapshot);
    }

    if (snapshotsForTrends.length > 0) {
      const sortedDates = [...dates]
        .map((item) => item.asOfDate)
        .sort((left, right) => left.localeCompare(right));
      const trends = buildSnapshotTrends(
        portfolio.code,
        snapshotsForTrends,
        sortedDates[0],
        sortedDates[sortedDates.length - 1],
      );
      writeFileSync(
        resolve(outDir, "trends-summary.json"),
        `${JSON.stringify(trends, null, 2)}\n`,
        "utf8",
      );
      console.log(`Exported: ${resolve(outDir, "trends-summary.json")}`);
    }
  }

  sqlite.close();
  console.log(`Done. ${exported} snapshot(s) written under docs/data/portfolios/`);

  return result;
}

void main();
