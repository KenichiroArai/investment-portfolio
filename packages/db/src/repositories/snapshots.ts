import { and, eq } from "drizzle-orm";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import {
  holdingLines,
  instruments,
  portfolioSnapshots,
} from "../schema/index";
import { getTagsForInstruments } from "./classifications";
import { findPortfolioByCode } from "./portfolios";

export type HoldingLineInput = {
  instrumentId: string;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor?: number | null;
};

export type ReplaceCurrentSnapshotParams = {
  portfolioCode: string;
  asOfDate: string;
  lines: HoldingLineInput[];
};

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
      quantity: holdingLines.quantity,
      marketValueMinor: holdingLines.marketValueMinor,
      bookValueMinor: holdingLines.bookValueMinor,
    })
    .from(holdingLines)
    .innerJoin(instruments, eq(holdingLines.instrumentId, instruments.id))
    .where(eq(holdingLines.snapshotId, snapshot.id));

  const instrumentIds = lines.map((line) => line.instrumentId);
  const tagsMap = await getTagsForInstruments(db, instrumentIds);

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
    const result = {
      id: line.id,
      instrumentId: line.instrumentId,
      instrumentName: line.instrumentName,
      quantity: line.quantity,
      marketValueMinor: line.marketValueMinor,
      bookValueMinor: line.bookValueMinor,
      tags: tags.map((tag) => ({
        schemeCode: tag.schemeCode,
        schemeName: tag.schemeName,
        valueCode: tag.valueCode,
        valueName: tag.valueName,
      })),
    };
    return result;
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
      const rows = params.lines.map((line) => ({
        id: newId(),
        snapshotId: snapshot.id,
        instrumentId: line.instrumentId,
        quantity: line.quantity,
        marketValueMinor: line.marketValueMinor,
        bookValueMinor: line.bookValueMinor ?? null,
      }));
      tx.insert(holdingLines).values(rows).run();
    }
  });

  const result = await getCurrentSnapshot(db, params.portfolioCode);
  return result;
}
