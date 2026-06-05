import { and, eq, inArray } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import {
  holdingLineMetrics,
  holdingLines,
  instruments,
  portfolioSnapshots,
} from "../schema/index";
import { getTagsForInstruments } from "./classifications";
import { findPortfolioByCode } from "./portfolios";

export type HoldingLineMetricInput = {
  code: string;
  integerValue?: number | null;
  realValue?: number | null;
  textValue?: string | null;
};

export type HoldingLineInput = {
  instrumentId: string;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor?: number | null;
  sortOrder?: number | null;
  metrics?: HoldingLineMetricInput[];
};

export type ReplaceCurrentSnapshotParams = {
  portfolioCode: string;
  asOfDate: string;
  lines: HoldingLineInput[];
};

type MetricRow = {
  holdingLineId: string;
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

async function getMetricsForHoldingLines(
  db: AppDatabase,
  holdingLineIds: string[],
) {
  const result = new Map<string, MetricRow[]>();
  if (holdingLineIds.length === 0) {
    return result;
  }

  const rows = await db
    .select({
      holdingLineId: holdingLineMetrics.holdingLineId,
      code: holdingLineMetrics.code,
      integerValue: holdingLineMetrics.integerValue,
      realValue: holdingLineMetrics.realValue,
      textValue: holdingLineMetrics.textValue,
    })
    .from(holdingLineMetrics)
    .where(inArray(holdingLineMetrics.holdingLineId, holdingLineIds));

  for (const row of rows) {
    const existing = result.get(row.holdingLineId) ?? [];
    existing.push(row);
    result.set(row.holdingLineId, existing);
  }

  return result;
}

export async function getCurrentSnapshot(db: AppDatabase, portfolioCode: string) {
  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    let result: null = null;
    return result;
  }

  const snapshots = await db
    .select()
    .from(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.portfolioId, portfolio.id),
        eq(portfolioSnapshots.isCurrent, 1),
      ),
    )
    .limit(1);

  const snapshot = snapshots[0];
  if (!snapshot) {
    let result: null = null;
    return result;
  }

  const lines = await db
    .select({
      id: holdingLines.id,
      instrumentId: holdingLines.instrumentId,
      instrumentName: instruments.name,
      sortOrder: holdingLines.sortOrder,
      quantity: holdingLines.quantity,
      marketValueMinor: holdingLines.marketValueMinor,
      bookValueMinor: holdingLines.bookValueMinor,
    })
    .from(holdingLines)
    .innerJoin(instruments, eq(holdingLines.instrumentId, instruments.id))
    .where(eq(holdingLines.snapshotId, snapshot.id));

  const instrumentIds = lines.map((line) => line.instrumentId);
  const holdingLineIds = lines.map((line) => line.id);
  const tagsMap = await getTagsForInstruments(db, instrumentIds);
  const metricsMap = await getMetricsForHoldingLines(db, holdingLineIds);

  const lineDtos = lines.map((line) => {
    const rawTags = tagsMap.get(line.instrumentId) ?? [];
    const tags = [...rawTags].sort((a, b) => {
      if (a.schemeCode !== b.schemeCode) {
        return a.schemeCode.localeCompare(b.schemeCode);
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.valueCode.localeCompare(b.valueCode);
    });
    const rawMetrics = metricsMap.get(line.id) ?? [];
    const metrics = [...rawMetrics]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((metric) => ({
        code: metric.code,
        integerValue: metric.integerValue,
        realValue: metric.realValue,
        textValue: metric.textValue,
      }));
    const result = {
      id: line.id,
      instrumentId: line.instrumentId,
      instrumentName: line.instrumentName,
      sortOrder: line.sortOrder,
      quantity: line.quantity,
      marketValueMinor: line.marketValueMinor,
      bookValueMinor: line.bookValueMinor,
      metrics,
      tags: tags.map((tag) => ({
        schemeCode: tag.schemeCode,
        schemeName: tag.schemeName,
        valueCode: tag.valueCode,
        valueName: tag.valueName,
      })),
    };
    return result;
  });

  lineDtos.sort((a, b) => {
    if (a.sortOrder !== null && b.sortOrder !== null && a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    if (a.sortOrder !== null && b.sortOrder === null) {
      return -1;
    }
    if (a.sortOrder === null && b.sortOrder !== null) {
      return 1;
    }
    return a.instrumentName.localeCompare(b.instrumentName);
  });

  const result = {
    id: snapshot.id,
    portfolioCode: portfolio.code,
    portfolioName: portfolio.name,
    asOfDate: snapshot.asOfDate,
    lines: lineDtos,
  };
  return result;
}

export async function replaceCurrentSnapshot(
  db: AppDatabase,
  params: ReplaceCurrentSnapshotParams,
) {
  const portfolio = await findPortfolioByCode(db, params.portfolioCode);
  if (!portfolio) {
    let result: null = null;
    return result;
  }

  db.transaction((tx) => {
    tx.update(portfolioSnapshots)
      .set({ isCurrent: 0 })
      .where(
        and(
          eq(portfolioSnapshots.portfolioId, portfolio.id),
          eq(portfolioSnapshots.isCurrent, 1),
        ),
      )
      .run();

    const snapshot = {
      id: newId(),
      portfolioId: portfolio.id,
      asOfDate: params.asOfDate,
      isCurrent: 1,
      createdAt: nowIso(),
    };
    tx.insert(portfolioSnapshots).values(snapshot).run();

    if (params.lines.length > 0) {
      const metricRows: Array<{
        id: string;
        holdingLineId: string;
        code: string;
        integerValue: number | null;
        realValue: number | null;
        textValue: string | null;
      }> = [];

      for (const line of params.lines) {
        const holdingLineId = newId();
        tx.insert(holdingLines)
          .values({
            id: holdingLineId,
            snapshotId: snapshot.id,
            instrumentId: line.instrumentId,
            sortOrder: line.sortOrder ?? null,
            quantity: line.quantity,
            marketValueMinor: line.marketValueMinor,
            bookValueMinor: line.bookValueMinor ?? null,
          })
          .run();

        for (const metric of line.metrics ?? []) {
          metricRows.push({
            id: newId(),
            holdingLineId,
            code: metric.code,
            integerValue: metric.integerValue ?? null,
            realValue: metric.realValue ?? null,
            textValue: metric.textValue ?? null,
          });
        }
      }

      if (metricRows.length > 0) {
        tx.insert(holdingLineMetrics).values(metricRows).run();
      }
    }
  });

  const result = await getCurrentSnapshot(db, params.portfolioCode);
  return result;
}
