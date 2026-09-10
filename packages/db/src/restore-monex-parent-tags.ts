import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import {
  findSchemeByPortfolioCodeAndSchemeCode,
  listClassificationValuesBySchemeId,
  setInstrumentClassificationsWithWeights,
} from "./repositories/classifications";
import { listInstruments } from "./repositories/instruments";

const MONEX_PORTFOLIO_CODE = "monex";
const MONEX_SCHEME_CODE = "monex_asset_class";
const STYLE_CODES = new Set(["income", "growth", "blend"]);

type DocsSnapshot = {
  lines?: Array<{
    instrumentName: string;
    tags?: Array<{
      schemeCode: string;
      valueCode: string;
      allocationWeight: number | null;
    }>;
  }>;
};

async function main() {
  let result: void = undefined;

  const databasePath = resolveDatabasePath();
  const packageDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(packageDir, "../../..");
  const docsPath = resolve(repoRoot, "docs/data/portfolios/monex/current.json");
  const docs = JSON.parse(readFileSync(docsPath, "utf8")) as DocsSnapshot;

  const tagsByInstrumentName = new Map<
    string,
    Array<{ valueCode: string; allocationWeight: number }>
  >();
  for (const line of docs.lines ?? []) {
    const schemeTags = (line.tags ?? [])
      .filter((tag) => tag.schemeCode === MONEX_SCHEME_CODE)
      .map((tag) => ({
        valueCode: tag.valueCode,
        allocationWeight:
          tag.allocationWeight !== null && Number.isFinite(tag.allocationWeight)
            ? tag.allocationWeight
            : 1,
      }));
    if (schemeTags.length === 0) {
      continue;
    }
    // 親タグを含むものだけ復元対象（スタイルのみはスキップ）
    if (!schemeTags.some((tag) => !STYLE_CODES.has(tag.valueCode))) {
      continue;
    }
    tagsByInstrumentName.set(line.instrumentName, schemeTags);
  }

  const { sqlite, db } = createDb(databasePath);
  const scheme = await findSchemeByPortfolioCodeAndSchemeCode(
    db,
    MONEX_PORTFOLIO_CODE,
    MONEX_SCHEME_CODE,
  );
  if (!scheme) {
    sqlite.close();
    throw new Error("monex_asset_class scheme not found");
  }

  const values = await listClassificationValuesBySchemeId(db, scheme.id);
  const valueIdByCode = new Map(values.map((value) => [value.code, value.id]));
  const instruments = await listInstruments(db, { portfolioCode: MONEX_PORTFOLIO_CODE });

  let updated = 0;
  let skippedMissingValue = 0;
  let skippedMissingInstrument = 0;

  for (const [instrumentName, tags] of tagsByInstrumentName) {
    const instrument = instruments.find((item) => item.name === instrumentName);
    if (!instrument) {
      skippedMissingInstrument += 1;
      continue;
    }

    const weights = [];
    let missing = false;
    for (const tag of tags) {
      const valueId = valueIdByCode.get(tag.valueCode);
      if (!valueId) {
        missing = true;
        break;
      }
      weights.push({
        classificationValueId: valueId,
        allocationWeight: tag.allocationWeight,
      });
    }
    if (missing || weights.length === 0) {
      skippedMissingValue += 1;
      continue;
    }

    await setInstrumentClassificationsWithWeights(db, instrument.id, weights);
    updated += 1;
  }

  sqlite.close();
  console.log(
    `Restored monex parent tags: updated=${updated}, missingInstrument=${skippedMissingInstrument}, missingValue=${skippedMissingValue}, source=${docsPath}`,
  );
  return result;
}

void main();
