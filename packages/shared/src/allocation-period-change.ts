import type { AllocationSeriesInput } from "./allocation-series";
import type { AggregatedTrendPoint } from "./snapshot-trend-aggregation";
import {
  compareNullableNumbers,
  compareStrings,
  type SortDirection,
} from "./table-sort";

export type AllocationPeriodChangeRow = {
  key: string;
  label: string;
  startRatio: number;
  endRatio: number;
  deltaRatio: number;
  startMarketValueMinor: number;
  endMarketValueMinor: number;
  deltaMarketValueMinor: number;
  ratioSeries: Array<number | null>;
};

export type AllocationPeriodChangeSortColumn =
  | "label"
  | "startRatio"
  | "endRatio"
  | "deltaRatio"
  | "startMarketValueMinor"
  | "endMarketValueMinor"
  | "deltaMarketValueMinor";

function resolveSliceValue(
  point: AggregatedTrendPoint,
  schemeCode: string,
  valueCode: string,
): { ratio: number | null; marketValueMinor: number | null } {
  let result: { ratio: number | null; marketValueMinor: number | null } = {
    ratio: null,
    marketValueMinor: null,
  };
  let allocations = point.allocationsByScheme[schemeCode];
  if (allocations === undefined) {
    allocations = [];
  }
  const slice = allocations.find((item) => item.valueCode === valueCode);
  if (!slice) {
    return result;
  }
  result = {
    ratio: slice.ratio,
    marketValueMinor: slice.marketValueMinor,
  };
  return result;
}

export function buildAllocationRatioSeries(
  chartPoints: AggregatedTrendPoint[],
  schemeCode: string,
): AllocationSeriesInput[] {
  let result: AllocationSeriesInput[] = [];

  const valueCodes = new Set<string>();
  for (const point of chartPoints) {
    const slices = point.allocationsByScheme[schemeCode] ?? [];
    for (const slice of slices) {
      valueCodes.add(slice.valueCode);
    }
  }

  result = [...valueCodes].map((valueCode) => {
    const firstSlice = chartPoints
      .flatMap((point) => point.allocationsByScheme[schemeCode] ?? [])
      .find((slice) => slice.valueCode === valueCode);
    let item: AllocationSeriesInput = {
      key: valueCode,
      label: firstSlice?.valueName ?? valueCode,
      values: chartPoints.map((point) => {
        const slice = (point.allocationsByScheme[schemeCode] ?? []).find(
          (allocation) => allocation.valueCode === valueCode,
        );
        return slice ? slice.ratio : null;
      }),
    };
    return item;
  });

  return result;
}

export function buildAllocationPeriodChangeRows(
  start: AggregatedTrendPoint,
  end: AggregatedTrendPoint,
  chartPoints: AggregatedTrendPoint[],
  schemeCode: string,
): AllocationPeriodChangeRow[] {
  let result: AllocationPeriodChangeRow[] = [];

  const ratioSeries = buildAllocationRatioSeries(chartPoints, schemeCode);
  const valueCodes = new Set<string>([
    ...(start.allocationsByScheme[schemeCode] ?? []).map((slice) => slice.valueCode),
    ...(end.allocationsByScheme[schemeCode] ?? []).map((slice) => slice.valueCode),
  ]);

  for (const valueCode of valueCodes) {
    const startValues = resolveSliceValue(start, schemeCode, valueCode);
    const endValues = resolveSliceValue(end, schemeCode, valueCode);

    if (startValues.ratio === null && endValues.ratio === null) {
      continue;
    }

    const safeStartRatio = Number.isFinite(startValues.ratio) ? startValues.ratio! : 0;
    const safeEndRatio = Number.isFinite(endValues.ratio) ? endValues.ratio! : 0;
    const safeStartMarketValue = Number.isFinite(startValues.marketValueMinor)
      ? startValues.marketValueMinor!
      : 0;
    const safeEndMarketValue = Number.isFinite(endValues.marketValueMinor)
      ? endValues.marketValueMinor!
      : 0;

    const seriesItem = ratioSeries.find((item) => item.key === valueCode);
    const label = seriesItem?.label ?? valueCode;

    result.push({
      key: valueCode,
      label,
      startRatio: safeStartRatio,
      endRatio: safeEndRatio,
      deltaRatio: safeEndRatio - safeStartRatio,
      startMarketValueMinor: safeStartMarketValue,
      endMarketValueMinor: safeEndMarketValue,
      deltaMarketValueMinor: safeEndMarketValue - safeStartMarketValue,
      ratioSeries: seriesItem?.values ?? [],
    });
  }

  result = sortAllocationPeriodChangeRows(result, "deltaRatio", "desc", true);
  return result;
}

export function sortAllocationPeriodChangeRows(
  rows: AllocationPeriodChangeRow[],
  column: AllocationPeriodChangeSortColumn,
  direction: SortDirection,
  absoluteDeltaRatio = false,
): AllocationPeriodChangeRow[] {
  let result = [...rows];

  if (column === "label") {
    result.sort((left, right) => compareStrings(left.label, right.label, direction));
    return result;
  }

  if (column === "deltaRatio" && absoluteDeltaRatio) {
    result.sort((left, right) => {
      let cmp = Math.abs(right.deltaRatio) - Math.abs(left.deltaRatio);
      if (direction === "asc") {
        cmp = -cmp;
      }
      return cmp;
    });
    return result;
  }

  result.sort((left, right) => {
    let cmp = 0;
    switch (column) {
      case "startRatio":
        cmp = compareNullableNumbers(left.startRatio, right.startRatio, "asc");
        break;
      case "endRatio":
        cmp = compareNullableNumbers(left.endRatio, right.endRatio, "asc");
        break;
      case "deltaRatio":
        cmp = compareNullableNumbers(left.deltaRatio, right.deltaRatio, "asc");
        break;
      case "startMarketValueMinor":
        cmp = compareNullableNumbers(
          left.startMarketValueMinor,
          right.startMarketValueMinor,
          "asc",
        );
        break;
      case "endMarketValueMinor":
        cmp = compareNullableNumbers(
          left.endMarketValueMinor,
          right.endMarketValueMinor,
          "asc",
        );
        break;
      case "deltaMarketValueMinor":
        cmp = compareNullableNumbers(
          left.deltaMarketValueMinor,
          right.deltaMarketValueMinor,
          "asc",
        );
        break;
      default:
        cmp = 0;
        break;
    }
    if (direction === "desc") {
      cmp = -cmp;
    }
    return cmp;
  });

  return result;
}

export const __allocationPeriodChangeTesting = {
  resolveSliceValue,
};
