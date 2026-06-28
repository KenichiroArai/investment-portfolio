import { findClassificationTagValue } from "./analysis-schemes";
import { IDECO_KAKEIBO_METRIC_CODES, type HoldingLineMetricDto } from "./holding-line-metrics";
import type { AllocationSliceWithLines } from "./snapshot-allocation";
import type { HoldingLineDto } from "./types";

export type SortDirection = "asc" | "desc";

export type HoldingLineDetailSortRow = {
  id: string;
  instrumentName: string;
  quantity: number;
  marketValueMinor: number;
  weight: number;
  metrics: HoldingLineMetricDto[];
  portfolioName?: string;
};

export function compareNullableNumbers(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: SortDirection,
): number {
  let result = 0;
  const leftMissing =
    left === null || left === undefined || !Number.isFinite(left);
  const rightMissing =
    right === null || right === undefined || !Number.isFinite(right);

  if (leftMissing && rightMissing) {
    return result;
  }

  if (leftMissing) {
    result = 1;
    return direction === "asc" ? result : -result;
  }

  if (rightMissing) {
    result = -1;
    return direction === "asc" ? result : -result;
  }

  result = left - right;
  if (direction === "desc") {
    result = -result;
  }

  return result;
}

export function compareStrings(
  left: string,
  right: string,
  direction: SortDirection,
): number {
  let result = left.localeCompare(right, "ja");
  if (direction === "desc") {
    result = -result;
  }
  return result;
}

export function getMetricIntegerValue(
  metrics: HoldingLineMetricDto[],
  code: string,
): number | null {
  let result: number | null = null;
  const metric = metrics.find((item) => item.code === code);

  if (!metric || metric.integerValue === null) {
    return result;
  }

  result = metric.integerValue;
  return result;
}

export function getMetricRealValue(
  metrics: HoldingLineMetricDto[],
  code: string,
): number | null {
  let result: number | null = null;
  const metric = metrics.find((item) => item.code === code);

  if (!metric || metric.realValue === null) {
    return result;
  }

  result = metric.realValue;
  return result;
}

export function classificationSortColumnKey(schemeCode: string): string {
  let result = `classification:${schemeCode}`;
  return result;
}

export function compareHoldingsDetailLines(
  left: HoldingLineDto,
  right: HoldingLineDto,
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
    result = compareNullableNumbers(left.quantity, right.quantity, direction);
  } else if (column === "unitPrice") {
    result = compareNullableNumbers(
      getMetricIntegerValue(
        left.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
      ),
      getMetricIntegerValue(
        right.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
      ),
      direction,
    );
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.marketValueMinor,
      right.marketValueMinor,
      direction,
    );
  } else if (column === "bookValue") {
    result = compareNullableNumbers(
      left.bookValueMinor,
      right.bookValueMinor,
      direction,
    );
  } else if (column === "unrealizedGain") {
    result = compareNullableNumbers(
      getMetricIntegerValue(
        left.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      ),
      getMetricIntegerValue(
        right.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      ),
      direction,
    );
  } else if (column === "unrealizedGainRate") {
    result = compareNullableNumbers(
      getMetricRealValue(
        left.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      ),
      getMetricRealValue(
        right.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      ),
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

export function sortHoldingsDetailLines(
  lines: HoldingLineDto[],
  column: string,
  direction: SortDirection,
): HoldingLineDto[] {
  let result = [...lines];
  result.sort((left, right) =>
    compareHoldingsDetailLines(left, right, column, direction),
  );
  return result;
}

type AllocationSliceSortRow = AllocationSliceWithLines & {
  targetRatio?: number | null;
  gapRatio?: number | null;
};

export function compareAllocationSlices(
  left: AllocationSliceSortRow,
  right: AllocationSliceSortRow,
  column: string,
  direction: SortDirection,
): number {
  let result = 0;

  if (column === "valueName") {
    result = compareStrings(left.valueName, right.valueName, direction);
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.marketValueMinor,
      right.marketValueMinor,
      direction,
    );
  } else if (column === "weight") {
    result = compareNullableNumbers(left.weight, right.weight, direction);
  } else if (column === "targetRatio") {
    result = compareNullableNumbers(left.targetRatio, right.targetRatio, direction);
  } else if (column === "gapRatio") {
    result = compareNullableNumbers(left.gapRatio, right.gapRatio, direction);
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
  }

  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.valueName, right.valueName, "asc");
  return result;
}

export function sortAllocationSlices<T extends AllocationSliceWithLines>(
  slices: T[],
  column: string,
  direction: SortDirection,
): T[] {
  let result = [...slices];
  result.sort((left, right) =>
    compareAllocationSlices(left, right, column, direction),
  );
  return result;
}

export function compareHoldingLineDetailRows(
  left: HoldingLineDetailSortRow,
  right: HoldingLineDetailSortRow,
  column: string,
  direction: SortDirection,
): number {
  let result = 0;

  if (column === "portfolioName") {
    result = compareStrings(left.portfolioName ?? "", right.portfolioName ?? "", direction);
  } else if (column === "instrumentName") {
    result = compareStrings(left.instrumentName, right.instrumentName, direction);
  } else if (column === "quantity") {
    result = compareNullableNumbers(left.quantity, right.quantity, direction);
  } else if (column === "marketValue") {
    result = compareNullableNumbers(
      left.marketValueMinor,
      right.marketValueMinor,
      direction,
    );
  } else if (column === "weight") {
    result = compareNullableNumbers(left.weight, right.weight, direction);
  } else if (column === "unrealizedGain") {
    result = compareNullableNumbers(
      getMetricIntegerValue(
        left.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      ),
      getMetricIntegerValue(
        right.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
      ),
      direction,
    );
  } else if (column === "unrealizedGainRate") {
    result = compareNullableNumbers(
      getMetricRealValue(
        left.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      ),
      getMetricRealValue(
        right.metrics,
        IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
      ),
      direction,
    );
  }

  if (result !== 0) {
    return result;
  }

  result = compareStrings(left.instrumentName, right.instrumentName, "asc");
  return result;
}

export function sortHoldingLineDetailRows<T extends HoldingLineDetailSortRow>(
  rows: T[],
  column: string,
  direction: SortDirection,
): T[] {
  let result = [...rows];
  result.sort((left, right) =>
    compareHoldingLineDetailRows(left, right, column, direction),
  );
  return result;
}
