import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMonexInstrumentAssetClassBreakdownFromMarketValues,
  buildMonexInstrumentNameAliasMap,
  listMonexInstrumentAliasLookupNames,
  resolveMonexCanonicalInstrumentName,
} from "@repo/shared";

import { applyMonexAssetClassWeights } from "./apply-monex-asset-class-weights";
import { createDb } from "./client";
import { resolveDatabasePath } from "./database-path";
import {
  getTagsForInstruments,
  setInstrumentClassificationsWithWeights,
} from "./repositories/classifications";
import { listInstruments } from "./repositories/instruments";

const MONEX_PORTFOLIO_CODE = "monex";
const MONEX_SCHEME_CODE = "monex_asset_class";

type MarketValueRow = {
  instrumentName: string;
  valueCode: string;
  marketValueMinor: number;
};

function normalizeInstrumentName(name: string): string {
  let result = name
    .replace(/[\u0020\u3000]+/g, " ")
    .replace(/（JEPQ）$/u, "")
    .replace(/（PFFD）$/u, "")
    .replace(/（除く日本）$/u, "")
    .replace(/＜為替ヘッジあり＞/u, "＜為替ヘッジなし＞")
    .trim();
  return result;
}

function buildInstrumentLookup(
  instruments: Array<{ id: string; name: string }>,
  aliasMap: Map<string, string[]>,
): Map<string, string> {
  let result = new Map<string, string>();

  for (const instrument of instruments) {
    const lookupNames = listMonexInstrumentAliasLookupNames(instrument.name, aliasMap);
    for (const lookupName of lookupNames) {
      result.set(lookupName, instrument.id);
      result.set(normalizeInstrumentName(lookupName), instrument.id);
    }
    result.set(instrument.name, instrument.id);
    result.set(normalizeInstrumentName(instrument.name), instrument.id);
  }

  return result;
}

function resolveInstrumentId(
  instrumentName: string,
  lookup: Map<string, string>,
  aliasMap: Map<string, string[]>,
): string | null {
  let result: string | null = null;

  const candidates = [
    instrumentName,
    resolveMonexCanonicalInstrumentName(instrumentName, aliasMap),
    normalizeInstrumentName(instrumentName),
    normalizeInstrumentName(resolveMonexCanonicalInstrumentName(instrumentName, aliasMap)),
  ];

  for (const candidate of candidates) {
    const id = lookup.get(candidate);
    if (id) {
      result = id;
      return result;
    }
  }

  return result;
}

async function main() {
  let result: void = undefined;

  const packageDir = dirname(fileURLToPath(import.meta.url));
  const fixturePath = resolve(packageDir, "../fixtures/monex-asset-class-market-values.json");
  const rows = JSON.parse(readFileSync(fixturePath, "utf8")) as MarketValueRow[];

  const aliasMap = buildMonexInstrumentNameAliasMap();
  const breakdownByName = buildMonexInstrumentAssetClassBreakdownFromMarketValues(
    rows,
    aliasMap,
  );

  const databasePath = resolveDatabasePath();
  const { sqlite, db } = createDb(databasePath);
  const instruments = await listInstruments(db, { portfolioCode: MONEX_PORTFOLIO_CODE });
  const lookup = buildInstrumentLookup(instruments, aliasMap);

  const assignments = [];
  const unmatchedNames: string[] = [];
  const matchedInstrumentIds = new Set<string>();

  for (const [instrumentName, entries] of breakdownByName) {
    const instrumentId = resolveInstrumentId(instrumentName, lookup, aliasMap);
    if (!instrumentId) {
      unmatchedNames.push(instrumentName);
      continue;
    }
    if (matchedInstrumentIds.has(instrumentId)) {
      continue;
    }
    matchedInstrumentIds.add(instrumentId);
    assignments.push({
      instrumentId,
      weights: entries.map((entry) => ({
        valueCode: entry.valueCode,
        allocationWeight: entry.allocationWeight,
      })),
    });
  }

  const applied = await applyMonexAssetClassWeights(db, assignments);

  const tagsByInstrument = await getTagsForInstruments(
    db,
    instruments.map((instrument) => instrument.id),
  );

  let cleared = 0;
  for (const instrument of instruments) {
    if (matchedInstrumentIds.has(instrument.id)) {
      continue;
    }

    const tags = tagsByInstrument.get(instrument.id) ?? [];
    const hasMonexSchemeTag = tags.some((tag) => tag.schemeCode === MONEX_SCHEME_CODE);
    if (!hasMonexSchemeTag) {
      continue;
    }

    // 他スキームのタグは通常 monex に無い。資産クラス再適用のため全クリアする
    await setInstrumentClassificationsWithWeights(db, instrument.id, []);
    cleared += 1;
  }

  sqlite.close();
  console.log(
    JSON.stringify(
      {
        databasePath,
        appliedInstrumentCount: applied.updatedInstrumentCount,
        assignmentCount: assignments.length,
        clearedInstrumentCount: cleared,
        unmatchedNames,
        breakdownInstrumentCount: breakdownByName.size,
      },
      null,
      2,
    ),
  );
  return result;
}

void main();
