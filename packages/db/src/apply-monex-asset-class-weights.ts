import {
  MONEX_ASSET_CLASS_VALUES,
  MONEX_SCHEME_CODES,
} from "@repo/shared";

import type { AppDatabase } from "./client";
import {
  createClassificationScheme,
  createClassificationValue,
  findClassificationValueBySchemeAndCode,
  findSchemeByPortfolioCodeAndSchemeCode,
  setInstrumentClassificationsWithWeights,
} from "./repositories/classifications";
import { findInstrumentById } from "./repositories/instruments";
import { findPortfolioByCode } from "./repositories/portfolios";

const MONEX_PORTFOLIO_CODE = "monex";

export type MonexAssetClassWeightEntryInput = {
  valueCode: string;
  allocationWeight: number;
};

export type MonexAssetClassWeightAssignmentInput = {
  instrumentId: string;
  weights: MonexAssetClassWeightEntryInput[];
};

export type ApplyMonexAssetClassWeightsResult = {
  updatedInstrumentCount: number;
};

async function ensureMonexAssetClassScheme(db: AppDatabase) {
  let result = await findSchemeByPortfolioCodeAndSchemeCode(
    db,
    MONEX_PORTFOLIO_CODE,
    MONEX_SCHEME_CODES.assetClass,
  );

  if (result) {
    return result;
  }

  result = await createClassificationScheme(db, {
    portfolioCode: MONEX_PORTFOLIO_CODE,
    code: MONEX_SCHEME_CODES.assetClass,
    name: "資産クラス",
  });
  return result;
}

async function syncMonexAssetClassValues(db: AppDatabase, schemeId: string) {
  let result: void = undefined;

  let sortOrder = 0;
  for (const assetClass of MONEX_ASSET_CLASS_VALUES) {
    const existing = await findClassificationValueBySchemeAndCode(
      db,
      schemeId,
      assetClass.code,
    );
    if (existing) {
      sortOrder += 1;
      continue;
    }

    await createClassificationValue(db, {
      schemeId,
      code: assetClass.code,
      name: assetClass.name,
      sortOrder,
    });
    sortOrder += 1;
  }

  return result;
}

export async function applyMonexAssetClassWeights(
  db: AppDatabase,
  assignments: MonexAssetClassWeightAssignmentInput[],
): Promise<ApplyMonexAssetClassWeightsResult> {
  let result: ApplyMonexAssetClassWeightsResult = { updatedInstrumentCount: 0 };

  const portfolio = await findPortfolioByCode(db, MONEX_PORTFOLIO_CODE);
  if (!portfolio) {
    throw new Error("マネックス証券ポートフォリオが見つかりません");
  }

  const scheme = await ensureMonexAssetClassScheme(db);
  if (!scheme) {
    throw new Error("資産クラス体系の作成に失敗しました");
  }

  await syncMonexAssetClassValues(db, scheme.id);

  const valueIdByCode = new Map<string, string>();
  for (const assetClass of MONEX_ASSET_CLASS_VALUES) {
    const value = await findClassificationValueBySchemeAndCode(
      db,
      scheme.id,
      assetClass.code,
    );
    if (value) {
      valueIdByCode.set(assetClass.code, value.id);
    }
  }

  for (const assignment of assignments) {
    const instrument = await findInstrumentById(db, assignment.instrumentId);
    if (!instrument || instrument.portfolioId !== portfolio.id) {
      continue;
    }

    const weights = [];
    for (const entry of assignment.weights) {
      const classificationValueId = valueIdByCode.get(entry.valueCode);
      if (!classificationValueId) {
        continue;
      }
      if (!Number.isFinite(entry.allocationWeight) || entry.allocationWeight <= 0) {
        continue;
      }
      weights.push({
        classificationValueId,
        allocationWeight: entry.allocationWeight,
      });
    }

    if (weights.length === 0) {
      continue;
    }

    await setInstrumentClassificationsWithWeights(db, assignment.instrumentId, weights);
    result.updatedInstrumentCount += 1;
  }

  return result;
}
