import type { AllocationSeriesInput } from "./allocation-series";
import { comparePortfolioInstrumentOrder } from "./portfolio-allocation";
import type { AggregatedTrendPoint } from "./snapshot-trend-aggregation";
import { PORTFOLIO_INSTRUMENT_SCHEME_CODE } from "./portfolio-instrument-scheme";
import { computePeriodRelativeRate } from "./trend-period-summary";
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
  relativeRate: number | null;
  startMarketValueMinor: number;
  endMarketValueMinor: number;
  deltaMarketValueMinor: number;
  ratioSeries: Array<number | null>;
  sortOrder?: number | null;
};

export type AllocationPeriodChangeSortColumn =
  | "label"
  | "sortOrder"
  | "startRatio"
  | "endRatio"
  | "deltaRatio"
  | "relativeRate"
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

function resolveSliceSortOrder(
  point: AggregatedTrendPoint,
  schemeCode: string,
  valueCode: string,
): number | null {
  let result: number | null = null;
  const slice = (point.allocationsByScheme[schemeCode] ?? []).find(
    (item) => item.valueCode === valueCode,
  );
  if (slice?.sortOrder !== undefined && slice.sortOrder !== null) {
    result = slice.sortOrder;
  }
  return result;
}

function sortRatioSeriesByPortfolioInstrumentOrder(
  series: AllocationSeriesInput[],
  chartPoints: AggregatedTrendPoint[],
  schemeCode: string,
): AllocationSeriesInput[] {
  let result = [...series];
  const metaByKey = new Map<
    string,
    { sortOrder: number | null; instrumentName: string; instrumentId: string }
  >();

  for (const point of chartPoints) {
    for (const slice of point.allocationsByScheme[schemeCode] ?? []) {
      if (metaByKey.has(slice.valueCode)) {
        continue;
      }
      metaByKey.set(slice.valueCode, {
        sortOrder: slice.sortOrder ?? null,
        instrumentName: slice.valueName,
        instrumentId: slice.valueCode,
      });
    }
  }

  result.sort((left, right) => {
    const leftMeta = metaByKey.get(left.key) ?? {
      sortOrder: null,
      instrumentName: left.label,
      instrumentId: left.key,
    };
    const rightMeta = metaByKey.get(right.key) ?? {
      sortOrder: null,
      instrumentName: right.label,
      instrumentId: right.key,
    };
    let cmp = comparePortfolioInstrumentOrder(leftMeta, rightMeta);
    return cmp;
  });

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

  if (schemeCode === PORTFOLIO_INSTRUMENT_SCHEME_CODE) {
    result = sortRatioSeriesByPortfolioInstrumentOrder(result, chartPoints, schemeCode);
  }

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
    const sortOrder =
      resolveSliceSortOrder(end, schemeCode, valueCode) ??
      resolveSliceSortOrder(start, schemeCode, valueCode);

    result.push({
      key: valueCode,
      label,
      startRatio: safeStartRatio,
      endRatio: safeEndRatio,
      deltaRatio: safeEndRatio - safeStartRatio,
      relativeRate: computePeriodRelativeRate(safeStartRatio, safeEndRatio),
      startMarketValueMinor: safeStartMarketValue,
      endMarketValueMinor: safeEndMarketValue,
      deltaMarketValueMinor: safeEndMarketValue - safeStartMarketValue,
      ratioSeries: seriesItem?.values ?? [],
      sortOrder,
    });
  }

  if (schemeCode === PORTFOLIO_INSTRUMENT_SCHEME_CODE) {
    result = sortAllocationPeriodChangeRows(result, "sortOrder", "asc");
    return result;
  }

  result = sortAllocationPeriodChangeRows(result, "deltaRatio", "desc", true);
  return result;
}

function compareAllocationPeriodChangeBySortOrder(
  left: AllocationPeriodChangeRow,
  right: AllocationPeriodChangeRow,
  direction: SortDirection,
): number {
  let result = 0;
  let cmp = comparePortfolioInstrumentOrder(
    {
      sortOrder: left.sortOrder ?? null,
      instrumentName: left.label,
      instrumentId: left.key,
    },
    {
      sortOrder: right.sortOrder ?? null,
      instrumentName: right.label,
      instrumentId: right.key,
    },
  );
  if (direction === "desc") {
    cmp = -cmp;
  }
  result = cmp;
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

  if (column === "sortOrder") {
    result.sort((left, right) =>
      compareAllocationPeriodChangeBySortOrder(left, right, direction),
    );
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
      case "relativeRate":
        cmp = compareNullableNumbers(left.relativeRate, right.relativeRate, "asc");
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
  resolveSliceSortOrder,
  sortRatioSeriesByPortfolioInstrumentOrder,
  compareAllocationPeriodChangeBySortOrder,
};
