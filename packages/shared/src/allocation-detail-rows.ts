import {
  buildAllocationByScheme,
  sumSnapshotMarketValue,
} from "./snapshot-allocation";
import {
  compareNullableNumbers,
  compareStrings,
  type SortDirection,
} from "./table-sort";
import type { CurrentSnapshotDto } from "./types";

export type AllocationDetailRow = {
  rowId: string;
  asOfDate: string;
  schemeCode: string;
  schemeName: string;
  valueCode: string;
  valueName: string;
  marketValueMinor: number;
  weight: number;
  portfolioWeight: number | null;
};

export type AllocationDetailFilter = {
  query?: string;
  asOfDate?: string | null;
  classificationValue?: string | null;
};

export type AllocationDetailSortColumn =
  | "asOfDate"
  | "valueName"
  | "marketValue"
  | "weight"
  | "portfolioWeight";

export function flattenAllocationInRange(
  snapshots: CurrentSnapshotDto[],
  schemeCode: string,
  schemeName: string,
): AllocationDetailRow[] {
  let result: AllocationDetailRow[] = [];

  const sortedSnapshots = [...snapshots].sort((left, right) =>
    left.asOfDate.localeCompare(right.asOfDate),
  );

  for (const snapshot of sortedSnapshots) {
    const totalMarketValue = sumSnapshotMarketValue(snapshot.lines);
    const allocation = buildAllocationByScheme(
      snapshot.lines,
      schemeCode,
      schemeName,
    );

    for (const slice of allocation.slices) {
      const portfolioWeight =
        totalMarketValue > 0 ? slice.marketValueMinor / totalMarketValue : null;
      let row: AllocationDetailRow = {
        rowId: `${snapshot.asOfDate}:${schemeCode}:${slice.valueCode}`,
        asOfDate: snapshot.asOfDate,
        schemeCode,
        schemeName,
        valueCode: slice.valueCode,
        valueName: slice.valueName,
        marketValueMinor: slice.marketValueMinor,
        weight: slice.weight,
        portfolioWeight,
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

function matchesQuery(row: AllocationDetailRow, query: string): boolean {
  let result = false;
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery === "") {
    result = true;
    return result;
  }

  result = normalizeSearchText(row.valueName).includes(normalizedQuery);
  return result;
}

function matchesClassificationValue(
  row: AllocationDetailRow,
  value: string | null | undefined,
): boolean {
  let result = true;

  if (!value || value === "__all__") {
    return result;
  }

  result = row.valueName === value || row.valueCode === value;
  return result;
}

export function filterAllocationDetailRows(
  rows: AllocationDetailRow[],
  filter: AllocationDetailFilter,
): AllocationDetailRow[] {
  let result: AllocationDetailRow[] = [];

  for (const row of rows) {
    if (filter.asOfDate && filter.asOfDate !== "__all__" && row.asOfDate !== filter.asOfDate) {
      continue;
    }

    if (!matchesQuery(row, filter.query ?? "")) {
      continue;
    }

    if (!matchesClassificationValue(row, filter.classificationValue)) {
      continue;
    }

    result.push(row);
  }

  return result;
}

export function compareAllocationDetailRows(
  left: AllocationDetailRow,
  right: AllocationDetailRow,
  column: string,
  direction: SortDirection,
): number {
  let result = 0;

  if (column === "asOfDate") {
    result = compareStrings(left.asOfDate, right.asOfDate, direction);
  } else if (column === "valueName") {
    result = compareStrings(left.valueName, right.valueName, direction);
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.marketValueMinor,
      right.marketValueMinor,
      direction,
    );
  } else if (column === "weight") {
    result = compareNullableNumbers(left.weight, right.weight, direction);
  } else if (column === "portfolioWeight") {
    result = compareNullableNumbers(
      left.portfolioWeight,
      right.portfolioWeight,
      direction,
    );
  }

  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.asOfDate, right.asOfDate, "desc");
  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.valueName, right.valueName, "asc");
  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.rowId, right.rowId, "asc");
  return result;
}

export function sortAllocationDetailRows(
  rows: AllocationDetailRow[],
  column: string,
  direction: SortDirection,
): AllocationDetailRow[] {
  let result = [...rows];
  result.sort((left, right) =>
    compareAllocationDetailRows(left, right, column, direction),
  );
  return result;
}
