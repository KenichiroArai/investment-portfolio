import { findClassificationTagValue } from "./analysis-schemes";
import { IDECO_KAKEIBO_METRIC_CODES } from "./holding-line-metrics";
import { findAdjacentSnapshotDate } from "./snapshot-time-range";
import {
  compareNullableNumbers,
  compareStrings,
  getMetricIntegerValue,
  getMetricRealValue,
  type SortDirection,
} from "./table-sort";
import type { ClassificationTagDto, HoldingLineDto } from "./types";

export type HoldingComparisonMode = "periodStart" | "previousSnapshot";

export type HoldingPeriodValues = {
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
  unitPrice: number | null;
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
};

export type HoldingPeriodDeltas = {
  quantity: number | null;
  marketValueMinor: number | null;
  bookValueMinor: number | null;
  unitPrice: number | null;
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
};

export type HoldingPeriodChangeRow = {
  lineId: string;
  instrumentId: string;
  instrumentName: string;
  sortOrder: number | null;
  tags: ClassificationTagDto[];
  end: HoldingPeriodValues;
  delta: HoldingPeriodDeltas;
  hasBaseline: boolean;
};

export type HoldingPeriodChangeSortColumn =
  | "sortOrder"
  | "instrumentName"
  | "quantity"
  | "unitPrice"
  | "marketValue"
  | "bookValue"
  | "unrealizedGain"
  | "unrealizedGainRate"
  | `classification:${string}`;

function extractHoldingPeriodValues(line: HoldingLineDto): HoldingPeriodValues {
  let result: HoldingPeriodValues = {
    quantity: line.quantity,
    marketValueMinor: line.marketValueMinor,
    bookValueMinor: line.bookValueMinor,
    unitPrice: getMetricIntegerValue(
      line.metrics,
      IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
    ),
    unrealizedGainMinor: getMetricIntegerValue(
      line.metrics,
      IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
    ),
    unrealizedGainRate: getMetricRealValue(
      line.metrics,
      IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
    ),
  };
  return result;
}

function computeDelta(
  start: number | null,
  end: number | null,
): number | null {
  let result: number | null = null;

  if (start === null || end === null) {
    return result;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return result;
  }

  result = end - start;
  return result;
}

function computePeriodDeltas(
  start: HoldingPeriodValues | null,
  end: HoldingPeriodValues,
): HoldingPeriodDeltas {
  let result: HoldingPeriodDeltas = {
    quantity: null,
    marketValueMinor: null,
    bookValueMinor: null,
    unitPrice: null,
    unrealizedGainMinor: null,
    unrealizedGainRate: null,
  };

  if (!start) {
    return result;
  }

  result = {
    quantity: computeDelta(start.quantity, end.quantity),
    marketValueMinor: computeDelta(start.marketValueMinor, end.marketValueMinor),
    bookValueMinor: computeDelta(start.bookValueMinor, end.bookValueMinor),
    unitPrice: computeDelta(start.unitPrice, end.unitPrice),
    unrealizedGainMinor: computeDelta(
      start.unrealizedGainMinor,
      end.unrealizedGainMinor,
    ),
    unrealizedGainRate: computeDelta(
      start.unrealizedGainRate,
      end.unrealizedGainRate,
    ),
  };
  return result;
}

export function resolveComparisonDate(
  mode: HoldingComparisonMode,
  selectedAsOfDate: string | null,
  availableDates: string[],
  rangeDates: string[],
): string | null {
  let result: string | null = null;

  if (!selectedAsOfDate) {
    return result;
  }

  if (mode === "previousSnapshot") {
    result = findAdjacentSnapshotDate(availableDates, selectedAsOfDate, "prev");
    return result;
  }

  if (rangeDates.length === 0) {
    return result;
  }

  const periodStart = rangeDates[0];
  if (periodStart === selectedAsOfDate) {
    return result;
  }

  result = periodStart;
  return result;
}

export function buildHoldingPeriodChangeRows(
  endLines: HoldingLineDto[],
  startLines: HoldingLineDto[] | null,
): HoldingPeriodChangeRow[] {
  let result: HoldingPeriodChangeRow[] = [];

  const startByInstrumentId = new Map<string, HoldingLineDto>();
  if (startLines) {
    for (const line of startLines) {
      startByInstrumentId.set(line.instrumentId, line);
    }
  }

  for (const endLine of endLines) {
    const startLine = startByInstrumentId.get(endLine.instrumentId) ?? null;
    const endValues = extractHoldingPeriodValues(endLine);
    const startValues = startLine ? extractHoldingPeriodValues(startLine) : null;

    let row: HoldingPeriodChangeRow = {
      lineId: endLine.id,
      instrumentId: endLine.instrumentId,
      instrumentName: endLine.instrumentName,
      sortOrder: endLine.sortOrder,
      tags: endLine.tags,
      end: endValues,
      delta: computePeriodDeltas(startValues, endValues),
      hasBaseline: startLine !== null,
    };
    result.push(row);
  }

  return result;
}

export function compareHoldingPeriodChangeRows(
  left: HoldingPeriodChangeRow,
  right: HoldingPeriodChangeRow,
  column: string,
  direction: SortDirection,
): number {
  let result = 0;

  if (column === "sortOrder") {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    result = compareNullableNumbers(leftOrder, rightOrder, direction);
  } else if (column === "instrumentName") {
    result = compareStrings(left.instrumentName, right.instrumentName, direction);
  } else if (column === "quantity") {
    result = compareNullableNumbers(left.end.quantity, right.end.quantity, direction);
  } else if (column === "unitPrice") {
    result = compareNullableNumbers(
      left.end.unitPrice,
      right.end.unitPrice,
      direction,
    );
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.end.marketValueMinor,
      right.end.marketValueMinor,
      direction,
    );
  } else if (column === "bookValue") {
    result = compareNullableNumbers(
      left.end.bookValueMinor,
      right.end.bookValueMinor,
      direction,
    );
  } else if (column === "unrealizedGain") {
    result = compareNullableNumbers(
      left.end.unrealizedGainMinor,
      right.end.unrealizedGainMinor,
      direction,
    );
  } else if (column === "unrealizedGainRate") {
    result = compareNullableNumbers(
      left.end.unrealizedGainRate,
      right.end.unrealizedGainRate,
      direction,
    );
  } else if (column.startsWith("classification:")) {
    const schemeCode = column.slice("classification:".length);
    const leftValue = findClassificationTagValue(left.tags, schemeCode) ?? "";
    const rightValue = findClassificationTagValue(right.tags, schemeCode) ?? "";
    result = compareStrings(leftValue, rightValue, direction);
  }

  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.instrumentName, right.instrumentName, "asc");
  return result;
}

export function sortHoldingPeriodChangeRows(
  rows: HoldingPeriodChangeRow[],
  column: string,
  direction: SortDirection,
): HoldingPeriodChangeRow[] {
  let result = [...rows];
  result.sort((left, right) =>
    compareHoldingPeriodChangeRows(left, right, column, direction),
  );
  return result;
}
