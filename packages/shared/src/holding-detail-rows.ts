import { findClassificationTagValue } from "./analysis-schemes";
import { IDECO_KAKEIBO_METRIC_CODES } from "./holding-line-metrics";
import {
  compareNullableNumbers,
  compareStrings,
  getMetricIntegerValue,
  getMetricRealValue,
  type SortDirection,
} from "./table-sort";
import type { ClassificationTagDto, CurrentSnapshotDto, HoldingLineDto } from "./types";

export type HoldingDetailRow = {
  asOfDate: string;
  instrumentId: string;
  instrumentName: string;
  sortOrder: number | null;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
  unitPrice: number | null;
  unrealizedGainMinor: number | null;
  unrealizedGainRate: number | null;
  tags: ClassificationTagDto[];
  portfolioWeight: number | null;
};

export type HoldingDetailFilter = {
  query?: string;
  asOfDate?: string | null;
  classificationSchemeCode?: string | null;
  classificationValue?: string | null;
};

export type HoldingDetailSortColumn =
  | "asOfDate"
  | "sortOrder"
  | "instrumentName"
  | "quantity"
  | "unitPrice"
  | "marketValue"
  | "bookValue"
  | "unrealizedGain"
  | "unrealizedGainRate"
  | "portfolioWeight"
  | `classification:${string}`;

export type PaginatedRowsResult<T> = {
  pageRows: T[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  rangeLabel: string;
};

function extractHoldingDetailValues(line: HoldingLineDto): Omit<
  HoldingDetailRow,
  "asOfDate" | "instrumentId" | "instrumentName" | "sortOrder" | "tags" | "portfolioWeight"
> {
  let result = {
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

export function flattenHoldingsInRange(
  snapshots: CurrentSnapshotDto[],
): HoldingDetailRow[] {
  let result: HoldingDetailRow[] = [];

  const sortedSnapshots = [...snapshots].sort((left, right) =>
    left.asOfDate.localeCompare(right.asOfDate),
  );

  for (const snapshot of sortedSnapshots) {
    let totalMarketValue = 0;
    for (const line of snapshot.lines) {
      totalMarketValue += line.marketValueMinor;
    }

    for (const line of snapshot.lines) {
      const values = extractHoldingDetailValues(line);
      const portfolioWeight =
        totalMarketValue > 0 ? line.marketValueMinor / totalMarketValue : null;
      let row: HoldingDetailRow = {
        asOfDate: snapshot.asOfDate,
        instrumentId: line.instrumentId,
        instrumentName: line.instrumentName,
        sortOrder: line.sortOrder,
        tags: line.tags,
        portfolioWeight,
        ...values,
      };
      result.push(row);
    }
  }

  return result;
}

function normalizeSearchText(text: string): string {
  let result = "";
  result = text.trim().toLowerCase().normalize("NFKC");
  return result;
}

function matchesQuery(row: HoldingDetailRow, query: string): boolean {
  let result = false;
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery === "") {
    result = true;
    return result;
  }

  result = normalizeSearchText(row.instrumentName).includes(normalizedQuery);
  return result;
}

function matchesClassification(
  row: HoldingDetailRow,
  schemeCode: string | null | undefined,
  value: string | null | undefined,
): boolean {
  let result = true;

  if (!schemeCode || !value || value === "__all__") {
    return result;
  }

  const tag = row.tags.find((item) => item.schemeCode === schemeCode);
  if (!tag) {
    result = false;
    return result;
  }

  result = tag.valueName === value || tag.valueCode === value;
  return result;
}

export function filterHoldingDetailRows(
  rows: HoldingDetailRow[],
  filter: HoldingDetailFilter,
): HoldingDetailRow[] {
  let result: HoldingDetailRow[] = [];

  for (const row of rows) {
    if (filter.asOfDate && filter.asOfDate !== "__all__" && row.asOfDate !== filter.asOfDate) {
      continue;
    }

    if (!matchesQuery(row, filter.query ?? "")) {
      continue;
    }

    if (
      !matchesClassification(
        row,
        filter.classificationSchemeCode,
        filter.classificationValue,
      )
    ) {
      continue;
    }

    result.push(row);
  }

  return result;
}

export function compareHoldingDetailRows(
  left: HoldingDetailRow,
  right: HoldingDetailRow,
  column: string,
  direction: SortDirection,
): number {
  let result = 0;

  if (column === "asOfDate") {
    result = compareStrings(left.asOfDate, right.asOfDate, direction);
  } else if (column === "sortOrder") {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    result = compareNullableNumbers(leftOrder, rightOrder, direction);
  } else if (column === "instrumentName") {
    result = compareStrings(left.instrumentName, right.instrumentName, direction);
  } else if (column === "quantity") {
    result = compareNullableNumbers(left.quantity, right.quantity, direction);
  } else if (column === "unitPrice") {
    result = compareNullableNumbers(left.unitPrice, right.unitPrice, direction);
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.marketValueMinor,
      right.marketValueMinor,
      direction,
    );
  } else if (column === "bookValue") {
    result = compareNullableNumbers(left.bookValueMinor, right.bookValueMinor, direction);
  } else if (column === "unrealizedGain") {
    result = compareNullableNumbers(
      left.unrealizedGainMinor,
      right.unrealizedGainMinor,
      direction,
    );
  } else if (column === "unrealizedGainRate") {
    result = compareNullableNumbers(
      left.unrealizedGainRate,
      right.unrealizedGainRate,
      direction,
    );
  } else if (column === "portfolioWeight") {
    result = compareNullableNumbers(left.portfolioWeight, right.portfolioWeight, direction);
  } else if (column.startsWith("classification:")) {
    const schemeCode = column.slice("classification:".length);
    const leftValue = findClassificationTagValue(left.tags, schemeCode) ?? "";
    const rightValue = findClassificationTagValue(right.tags, schemeCode) ?? "";
    result = compareStrings(leftValue, rightValue, direction);
  }

  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.asOfDate, right.asOfDate, "desc");
  if (result !== 0) {
    return result;
  }

  const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
  result = compareNullableNumbers(leftOrder, rightOrder, "asc");
  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.instrumentName, right.instrumentName, "asc");
  return result;
}

export function sortHoldingDetailRows(
  rows: HoldingDetailRow[],
  column: string,
  direction: SortDirection,
): HoldingDetailRow[] {
  let result = [...rows];
  result.sort((left, right) =>
    compareHoldingDetailRows(left, right, column, direction),
  );
  return result;
}

export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): PaginatedRowsResult<T> {
  let result: PaginatedRowsResult<T> = {
    pageRows: [],
    totalCount: rows.length,
    totalPages: 0,
    page: 1,
    pageSize,
    rangeLabel: "0 件",
  };

  if (pageSize <= 0) {
    return result;
  }

  const totalPages = rows.length === 0 ? 0 : Math.ceil(rows.length / pageSize);
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, rows.length);

  let rangeLabel = "0 件";
  if (rows.length > 0) {
    rangeLabel = `全 ${rows.length} 件中 ${startIndex + 1}–${endIndex} 件`;
  }

  result = {
    pageRows: rows.slice(startIndex, endIndex),
    totalCount: rows.length,
    totalPages,
    page: safePage,
    pageSize,
    rangeLabel,
  };
  return result;
}
