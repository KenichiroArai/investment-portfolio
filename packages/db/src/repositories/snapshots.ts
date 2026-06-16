import { and, eq, inArray } from "drizzle-orm";

import { assertUniqueSnapshotInstrumentIds } from "@repo/shared";

import type { AppDatabase } from "../client";
import { newId, nowIso } from "../id";
import {
  holdingLineMetrics,
  holdingLines,
  instruments,
  portfolioSnapshotMetrics,
  portfolioSnapshots,
} from "../schema/index";
import {
  getTagsForInstruments,
  listAnalysisSchemesForPortfolio,
} from "./classifications";
import { getAttributesForInstruments } from "./instruments";
import { findPortfolioByCode } from "./portfolios";

export type HoldingLineMetricInput = {
  code: string;
  integerValue?: number | null;
  realValue?: number | null;
  textValue?: string | null;
};

export type PortfolioSnapshotMetricInput = {
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
  metrics?: PortfolioSnapshotMetricInput[];
};

export type UpsertSnapshotByDateParams = ReplaceCurrentSnapshotParams & {
  setAsCurrent?: boolean;
};

export type SnapshotDateListItem = {
  asOfDate: string;
  isCurrent: boolean;
};

type MetricRow = {
  holdingLineId: string;
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

type AttributeRow = {
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

type LineDto = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  sortOrder: number | null;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
  metrics: AttributeRow[];
  instrumentAttributes: AttributeRow[];
  tags: Array<{
    schemeCode: string;
    schemeName: string;
    valueCode: string;
    valueName: string;
  }>;
};

type SnapshotMetricRow = {
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

type CurrentSnapshotDto = {
  id: string;
  portfolioCode: string;
  portfolioName: string;
  asOfDate: string;
  analysisSchemes: Array<{
    schemeCode: string;
    schemeName: string;
  }>;
  metrics: SnapshotMetricRow[];
  lines: LineDto[];
};

async function getMetricsForSnapshot(db: AppDatabase, snapshotId: string) {
  let result: SnapshotMetricRow[] = [];

  const rows = await db
    .select({
      code: portfolioSnapshotMetrics.code,
      integerValue: portfolioSnapshotMetrics.integerValue,
      realValue: portfolioSnapshotMetrics.realValue,
      textValue: portfolioSnapshotMetrics.textValue,
    })
    .from(portfolioSnapshotMetrics)
    .where(eq(portfolioSnapshotMetrics.snapshotId, snapshotId));

  result = [...rows]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((row) => {
      let metric: SnapshotMetricRow = {
        code: row.code,
        integerValue: row.integerValue,
        realValue: row.realValue,
        textValue: row.textValue,
      };
      return metric;
    });

  return result;
}

async function getMetricsForHoldingLines(
  db: AppDatabase,
  holdingLineIds: string[],
) {
  let result = new Map<string, MetricRow[]>();

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

type SnapshotRow = typeof portfolioSnapshots.$inferSelect;
type DbTransaction = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

function insertSnapshotContent(
  tx: DbTransaction,
  snapshotId: string,
  lines: HoldingLineInput[],
  metrics: PortfolioSnapshotMetricInput[] | undefined,
) {
  let result: void = undefined;

  if (lines.length > 0) {
    const metricRows: Array<{
      id: string;
      holdingLineId: string;
      code: string;
      integerValue: number | null;
      realValue: number | null;
      textValue: string | null;
    }> = [];

    for (const line of lines) {
      const holdingLineId = newId();
      tx.insert(holdingLines)
        .values({
          id: holdingLineId,
          snapshotId,
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

  const snapshotMetricRows: Array<{
    id: string;
    snapshotId: string;
    code: string;
    integerValue: number | null;
    realValue: number | null;
    textValue: string | null;
  }> = [];

  for (const metric of metrics ?? []) {
    snapshotMetricRows.push({
      id: newId(),
      snapshotId,
      code: metric.code,
      integerValue: metric.integerValue ?? null,
      realValue: metric.realValue ?? null,
      textValue: metric.textValue ?? null,
    });
  }

  if (snapshotMetricRows.length > 0) {
    tx.insert(portfolioSnapshotMetrics).values(snapshotMetricRows).run();
  }

  return result;
}

function clearSnapshotContent(tx: DbTransaction, snapshotId: string) {
  let result: void = undefined;

  const lineRows = tx
    .select({ id: holdingLines.id })
    .from(holdingLines)
    .where(eq(holdingLines.snapshotId, snapshotId))
    .all();
  const lineIds = lineRows.map((line) => line.id);

  if (lineIds.length > 0) {
    tx.delete(holdingLineMetrics)
      .where(inArray(holdingLineMetrics.holdingLineId, lineIds))
      .run();
  }

  tx.delete(holdingLines).where(eq(holdingLines.snapshotId, snapshotId)).run();
  tx.delete(portfolioSnapshotMetrics)
    .where(eq(portfolioSnapshotMetrics.snapshotId, snapshotId))
    .run();

  return result;
}

async function buildSnapshotDto(
  db: AppDatabase,
  portfolio: { id: string; code: string; name: string },
  snapshot: SnapshotRow,
) {
  let result: CurrentSnapshotDto | null = null;

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

  const instrumentIds = lines.map((line) => {
    let lineResult = line.instrumentId;
    return lineResult;
  });
  const holdingLineIds = lines.map((line) => {
    let lineResult = line.id;
    return lineResult;
  });
  const tagsMap = await getTagsForInstruments(db, instrumentIds);
  const metricsMap = await getMetricsForHoldingLines(db, holdingLineIds);
  const attributesMap = await getAttributesForInstruments(db, instrumentIds);

  const lineDtos = lines.map((line) => {
    let lineResult: LineDto = {
      id: "",
      instrumentId: "",
      instrumentName: "",
      sortOrder: null,
      quantity: 0,
      marketValueMinor: 0,
      bookValueMinor: null,
      metrics: [],
      instrumentAttributes: [],
      tags: [],
    };

    const rawTags = tagsMap.get(line.instrumentId) ?? [];
    const tags = [...rawTags].sort((a, b) => {
      let sortResult = 0;
      if (a.schemeCode !== b.schemeCode) {
        sortResult = a.schemeCode.localeCompare(b.schemeCode);
        return sortResult;
      }
      if (a.sortOrder !== b.sortOrder) {
        sortResult = a.sortOrder - b.sortOrder;
        return sortResult;
      }
      sortResult = a.valueCode.localeCompare(b.valueCode);
      return sortResult;
    });
    const rawMetrics = metricsMap.get(line.id) ?? [];
    const metrics = [...rawMetrics]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((metric) => {
        let metricResult = {
          code: metric.code,
          integerValue: metric.integerValue,
          realValue: metric.realValue,
          textValue: metric.textValue,
        };
        return metricResult;
      });
    const rawAttributes = attributesMap.get(line.instrumentId) ?? [];
    const instrumentAttributes = [...rawAttributes]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((attribute) => {
        let attributeResult = {
          code: attribute.code,
          integerValue: attribute.integerValue,
          realValue: attribute.realValue,
          textValue: attribute.textValue,
        };
        return attributeResult;
      });
    lineResult = {
      id: line.id,
      instrumentId: line.instrumentId,
      instrumentName: line.instrumentName,
      sortOrder: line.sortOrder,
      quantity: line.quantity,
      marketValueMinor: line.marketValueMinor,
      bookValueMinor: line.bookValueMinor,
      metrics,
      instrumentAttributes,
      tags: tags.map((tag) => {
        let tagResult = {
          schemeCode: tag.schemeCode,
          schemeName: tag.schemeName,
          valueCode: tag.valueCode,
          valueName: tag.valueName,
        };
        return tagResult;
      }),
    };
    return lineResult;
  });

  lineDtos.sort((a, b) => {
    let sortResult = 0;
    if (a.sortOrder !== null && b.sortOrder !== null && a.sortOrder !== b.sortOrder) {
      sortResult = a.sortOrder - b.sortOrder;
      return sortResult;
    }
    if (a.sortOrder !== null && b.sortOrder === null) {
      sortResult = -1;
      return sortResult;
    }
    if (a.sortOrder === null && b.sortOrder !== null) {
      sortResult = 1;
      return sortResult;
    }
    sortResult = a.instrumentName.localeCompare(b.instrumentName);
    return sortResult;
  });

  const analysisSchemes = await listAnalysisSchemesForPortfolio(db, portfolio.code);
  const snapshotMetrics = await getMetricsForSnapshot(db, snapshot.id);

  result = {
    id: snapshot.id,
    portfolioCode: portfolio.code,
    portfolioName: portfolio.name,
    asOfDate: snapshot.asOfDate,
    analysisSchemes,
    metrics: snapshotMetrics,
    lines: lineDtos,
  };
  return result;
}

export async function listSnapshotDates(db: AppDatabase, portfolioCode: string) {
  let result: SnapshotDateListItem[] = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const rows = await db
    .select({
      asOfDate: portfolioSnapshots.asOfDate,
      isCurrent: portfolioSnapshots.isCurrent,
    })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.portfolioId, portfolio.id));

  result = [...rows]
    .sort((left, right) => right.asOfDate.localeCompare(left.asOfDate))
    .map((row) => {
      let item: SnapshotDateListItem = {
        asOfDate: row.asOfDate,
        isCurrent: row.isCurrent === 1,
      };
      return item;
    });

  return result;
}

export async function getSnapshotByDate(
  db: AppDatabase,
  portfolioCode: string,
  asOfDate: string,
) {
  let result: CurrentSnapshotDto | null = null;

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const snapshots = await db
    .select()
    .from(portfolioSnapshots)
    .where(
      and(
        eq(portfolioSnapshots.portfolioId, portfolio.id),
        eq(portfolioSnapshots.asOfDate, asOfDate),
      ),
    )
    .limit(1);

  const snapshot = snapshots[0];
  if (!snapshot) {
    return result;
  }

  result = await buildSnapshotDto(db, portfolio, snapshot);
  return result;
}

export async function getSnapshotsInDateRange(
  db: AppDatabase,
  portfolioCode: string,
  from: string,
  to: string,
) {
  let result: CurrentSnapshotDto[] = [];

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  const snapshots = await db
    .select()
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.portfolioId, portfolio.id));

  const filtered = snapshots
    .filter((snapshot) => snapshot.asOfDate >= from && snapshot.asOfDate <= to)
    .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate));

  for (const snapshot of filtered) {
    const dto = await buildSnapshotDto(db, portfolio, snapshot);
    if (dto) {
      result.push(dto);
    }
  }

  return result;
}

export async function setCurrentSnapshot(
  db: AppDatabase,
  portfolioCode: string,
  asOfDate: string,
) {
  let result: CurrentSnapshotDto | null = null;

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
    return result;
  }

  db.transaction((tx) => {
    let txResult: void = undefined;

    tx.update(portfolioSnapshots)
      .set({ isCurrent: 0 })
      .where(eq(portfolioSnapshots.portfolioId, portfolio.id))
      .run();

    tx.update(portfolioSnapshots)
      .set({ isCurrent: 1 })
      .where(
        and(
          eq(portfolioSnapshots.portfolioId, portfolio.id),
          eq(portfolioSnapshots.asOfDate, asOfDate),
        ),
      )
      .run();

    return txResult;
  });

  result = await getSnapshotByDate(db, portfolioCode, asOfDate);
  return result;
}

export async function upsertSnapshotByDate(
  db: AppDatabase,
  params: UpsertSnapshotByDateParams,
) {
  let result: CurrentSnapshotDto | null = null;

  const portfolio = await findPortfolioByCode(db, params.portfolioCode);
  if (!portfolio) {
    return result;
  }

  assertUniqueSnapshotInstrumentIds(params.lines);

  db.transaction((tx) => {
    let txResult: void = undefined;

    if (params.setAsCurrent) {
      tx.update(portfolioSnapshots)
        .set({ isCurrent: 0 })
        .where(eq(portfolioSnapshots.portfolioId, portfolio.id))
        .run();
    }

    const existing = tx
      .select()
      .from(portfolioSnapshots)
      .where(
        and(
          eq(portfolioSnapshots.portfolioId, portfolio.id),
          eq(portfolioSnapshots.asOfDate, params.asOfDate),
        ),
      )
      .all()[0];

    let snapshotId = existing?.id ?? newId();

    if (existing) {
      clearSnapshotContent(tx, existing.id);
      if (params.setAsCurrent) {
        tx.update(portfolioSnapshots)
          .set({ isCurrent: 1 })
          .where(eq(portfolioSnapshots.id, existing.id))
          .run();
      }
    } else {
      tx.insert(portfolioSnapshots)
        .values({
          id: snapshotId,
          portfolioId: portfolio.id,
          asOfDate: params.asOfDate,
          isCurrent: params.setAsCurrent ? 1 : 0,
          createdAt: nowIso(),
        })
        .run();
    }

    insertSnapshotContent(tx, snapshotId, params.lines, params.metrics);

    return txResult;
  });

  result = await getSnapshotByDate(db, params.portfolioCode, params.asOfDate);
  return result;
}

export async function getCurrentSnapshot(db: AppDatabase, portfolioCode: string) {
  let result: CurrentSnapshotDto | null = null;

  const portfolio = await findPortfolioByCode(db, portfolioCode);
  if (!portfolio) {
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
    return result;
  }

  result = await buildSnapshotDto(db, portfolio, snapshot);
  return result;
}

export async function replaceCurrentSnapshot(
  db: AppDatabase,
  params: ReplaceCurrentSnapshotParams,
) {
  let result: Awaited<ReturnType<typeof getCurrentSnapshot>> = null;

  const portfolio = await findPortfolioByCode(db, params.portfolioCode);
  if (!portfolio) {
    return result;
  }

  await upsertSnapshotByDate(db, {
    ...params,
    setAsCurrent: true,
  });

  result = await getCurrentSnapshot(db, params.portfolioCode);
  return result;
}
