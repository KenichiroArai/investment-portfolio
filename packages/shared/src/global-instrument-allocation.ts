import type {
  AllocationSliceWithLines,
  GlobalAnalysisPortfolioSlice,
} from "./snapshot-allocation";
import { sumSnapshotMarketValue } from "./snapshot-allocation";
import type { CurrentSnapshotDto } from "./types";

export const GLOBAL_INSTRUMENT_OTHER_VALUE_CODE = "__other__";
export const GLOBAL_INSTRUMENT_OTHER_VALUE_NAME = "その他";
export const GLOBAL_INSTRUMENT_EMPTY_NAME_LABEL = "（名称なし）";

export type GlobalInstrumentPortfolioBreakdown = {
  portfolioCode: string;
  portfolioName: string;
  marketValueMinor: number;
  weightInInstrument: number;
};

export type GlobalInstrumentRow = {
  instrumentKey: string;
  instrumentName: string;
  marketValueMinor: number;
  bookValueMinor: number | null;
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
  weight: number;
  portfolios: GlobalInstrumentPortfolioBreakdown[];
};

export type GlobalInstrumentStackSeries = {
  key: string;
  label: string;
  values: Array<number | null>;
};

export type GlobalInstrumentStackChart = {
  labels: string[];
  series: GlobalInstrumentStackSeries[];
};

type InstrumentAccumulator = {
  instrumentKey: string;
  instrumentName: string;
  marketValueMinor: number;
  bookValueMinor: number;
  hasAllBookValues: boolean;
  portfolios: Map<
    string,
    { portfolioCode: string; portfolioName: string; marketValueMinor: number }
  >;
};

function normalizeInstrumentKey(instrumentName: string): string {
  let result = instrumentName.trim();
  return result;
}

function displayInstrumentName(instrumentKey: string): string {
  let result = GLOBAL_INSTRUMENT_EMPTY_NAME_LABEL;

  if (instrumentKey !== "") {
    result = instrumentKey;
  }

  return result;
}

export function buildGlobalPortfolioSlices(
  snapshots: CurrentSnapshotDto[],
): { totalMarketValueMinor: number; portfolios: GlobalAnalysisPortfolioSlice[] } {
  let result: {
    totalMarketValueMinor: number;
    portfolios: GlobalAnalysisPortfolioSlice[];
  } = {
    totalMarketValueMinor: 0,
    portfolios: [],
  };

  for (const snapshot of snapshots) {
    const marketValueMinor = sumSnapshotMarketValue(snapshot.lines);
    result.totalMarketValueMinor += marketValueMinor;
    result.portfolios.push({
      portfolioCode: snapshot.portfolioCode,
      portfolioName: snapshot.portfolioName,
      asOfDate: snapshot.asOfDate,
      marketValueMinor,
      weight: 0,
    });
  }

  for (const portfolio of result.portfolios) {
    portfolio.weight =
      result.totalMarketValueMinor > 0
        ? portfolio.marketValueMinor / result.totalMarketValueMinor
        : 0;
  }

  result.portfolios.sort(
    (left, right) => right.marketValueMinor - left.marketValueMinor,
  );
  return result;
}

export function buildGlobalInstrumentRows(
  snapshots: CurrentSnapshotDto[],
): GlobalInstrumentRow[] {
  let result: GlobalInstrumentRow[] = [];
  const totals = new Map<string, InstrumentAccumulator>();
  let totalMarketValueMinor = 0;

  for (const snapshot of snapshots) {
    for (const line of snapshot.lines) {
      const instrumentKey = normalizeInstrumentKey(line.instrumentName);
      totalMarketValueMinor += line.marketValueMinor;

      let existing = totals.get(instrumentKey);
      if (!existing) {
        existing = {
          instrumentKey,
          instrumentName: displayInstrumentName(instrumentKey),
          marketValueMinor: 0,
          bookValueMinor: 0,
          hasAllBookValues: true,
          portfolios: new Map(),
        };
        totals.set(instrumentKey, existing);
      }

      existing.marketValueMinor += line.marketValueMinor;

      if (line.bookValueMinor === null) {
        existing.hasAllBookValues = false;
      } else {
        existing.bookValueMinor += line.bookValueMinor;
      }

      const portfolioKey = snapshot.portfolioCode;
      const portfolioExisting = existing.portfolios.get(portfolioKey);
      if (portfolioExisting) {
        portfolioExisting.marketValueMinor += line.marketValueMinor;
        continue;
      }

      existing.portfolios.set(portfolioKey, {
        portfolioCode: snapshot.portfolioCode,
        portfolioName: snapshot.portfolioName,
        marketValueMinor: line.marketValueMinor,
      });
    }
  }

  for (const item of totals.values()) {
    const portfolios: GlobalInstrumentPortfolioBreakdown[] = [];
    for (const portfolio of item.portfolios.values()) {
      portfolios.push({
        portfolioCode: portfolio.portfolioCode,
        portfolioName: portfolio.portfolioName,
        marketValueMinor: portfolio.marketValueMinor,
        weightInInstrument:
          item.marketValueMinor > 0
            ? portfolio.marketValueMinor / item.marketValueMinor
            : 0,
      });
    }
    portfolios.sort((left, right) => right.marketValueMinor - left.marketValueMinor);

    let bookValueMinor: number | null = null;
    let unrealizedGainMinor: number | null = null;
    let unrealizedGainRate: number | null = null;

    if (item.hasAllBookValues) {
      bookValueMinor = item.bookValueMinor;
      unrealizedGainMinor = item.marketValueMinor - item.bookValueMinor;
      if (item.bookValueMinor !== 0) {
        unrealizedGainRate = unrealizedGainMinor / item.bookValueMinor;
      }
    }

    result.push({
      instrumentKey: item.instrumentKey,
      instrumentName: item.instrumentName,
      marketValueMinor: item.marketValueMinor,
      bookValueMinor,
      unrealizedGainMinor,
      unrealizedGainRate,
      weight:
        totalMarketValueMinor > 0
          ? item.marketValueMinor / totalMarketValueMinor
          : 0,
      portfolios,
    });
  }

  result.sort((left, right) => {
    let order = right.marketValueMinor - left.marketValueMinor;
    if (order !== 0) {
      return order;
    }
    order = left.instrumentName.localeCompare(right.instrumentName, "ja");
    return order;
  });
  return result;
}

export function collapseGlobalInstrumentRows(
  rows: GlobalInstrumentRow[],
  limit: number,
): GlobalInstrumentRow[] {
  let result: GlobalInstrumentRow[] = [];

  if (limit < 1 || rows.length <= limit) {
    result = [...rows];
    return result;
  }

  const head = rows.slice(0, limit);
  const rest = rows.slice(limit);
  let otherMarketValueMinor = 0;
  let otherBookValueMinor = 0;
  let otherHasAllBookValues = true;
  let otherWeight = 0;

  for (const row of rest) {
    otherMarketValueMinor += row.marketValueMinor;
    otherWeight += row.weight;
    if (row.bookValueMinor === null) {
      otherHasAllBookValues = false;
    } else {
      otherBookValueMinor += row.bookValueMinor;
    }
  }

  let bookValueMinor: number | null = null;
  let unrealizedGainMinor: number | null = null;
  let unrealizedGainRate: number | null = null;

  if (otherHasAllBookValues) {
    bookValueMinor = otherBookValueMinor;
    unrealizedGainMinor = otherMarketValueMinor - otherBookValueMinor;
    if (otherBookValueMinor !== 0) {
      unrealizedGainRate = unrealizedGainMinor / otherBookValueMinor;
    }
  }

  result = [
    ...head,
    {
      instrumentKey: GLOBAL_INSTRUMENT_OTHER_VALUE_CODE,
      instrumentName: GLOBAL_INSTRUMENT_OTHER_VALUE_NAME,
      marketValueMinor: otherMarketValueMinor,
      bookValueMinor,
      unrealizedGainMinor,
      unrealizedGainRate,
      weight: otherWeight,
      portfolios: [],
    },
  ];
  return result;
}

export function toInstrumentAllocationSlices(
  rows: GlobalInstrumentRow[],
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];

  for (const row of rows) {
    result.push({
      valueCode: row.instrumentKey,
      valueName: row.instrumentName,
      marketValueMinor: row.marketValueMinor,
      weight: row.weight,
      unrealizedGainMinor: row.unrealizedGainMinor,
      unrealizedGainRate: row.unrealizedGainRate,
      lines: [],
    });
  }

  return result;
}

export function toPortfolioAllocationSlices(
  portfolios: GlobalAnalysisPortfolioSlice[],
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];

  for (const portfolio of portfolios) {
    result.push({
      valueCode: portfolio.portfolioCode,
      valueName: portfolio.portfolioName,
      marketValueMinor: portfolio.marketValueMinor,
      weight: portfolio.weight,
      unrealizedGainMinor: null,
      unrealizedGainRate: null,
      lines: [],
    });
  }

  return result;
}

export function buildGlobalInstrumentRankingValues(
  rows: GlobalInstrumentRow[],
): Array<number | null> {
  let result: Array<number | null> = [];

  for (const row of rows) {
    result.push(row.marketValueMinor);
  }

  return result;
}

export function buildGlobalInstrumentPortfolioStack(
  rows: GlobalInstrumentRow[],
  portfolios: GlobalAnalysisPortfolioSlice[],
  limit: number,
): GlobalInstrumentStackChart {
  let result: GlobalInstrumentStackChart = {
    labels: [],
    series: [],
  };

  const chartRows = collapseGlobalInstrumentRows(rows, limit).filter(
    (row) => row.instrumentKey !== GLOBAL_INSTRUMENT_OTHER_VALUE_CODE,
  );

  for (const row of chartRows) {
    result.labels.push(row.instrumentName);
  }

  for (const portfolio of portfolios) {
    const values: Array<number | null> = [];
    for (const row of chartRows) {
      const breakdown = row.portfolios.find(
        (item) => item.portfolioCode === portfolio.portfolioCode,
      );
      values.push(breakdown?.marketValueMinor ?? 0);
    }
    result.series.push({
      key: portfolio.portfolioCode,
      label: portfolio.portfolioName,
      values,
    });
  }

  return result;
}
