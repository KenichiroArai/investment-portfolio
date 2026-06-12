import type { AggregatedTrendPoint } from "./snapshot-trend-aggregation";

export type TrendPeriodMetricUnit = "yen" | "percentPoint";

export type TrendPeriodMetricDelta = {
  key: string;
  label: string;
  start: number;
  end: number;
  absoluteDelta: number;
  relativeRate: number | null;
  unit: TrendPeriodMetricUnit;
};

export function computePeriodRelativeRate(
  start: number,
  end: number,
): number | null {
  let result: number | null = null;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start === 0) {
    return result;
  }

  result = (end - start) / Math.abs(start);
  return result;
}

function buildMetricDelta(
  key: string,
  label: string,
  start: number,
  end: number,
  unit: TrendPeriodMetricUnit,
): TrendPeriodMetricDelta {
  let result: TrendPeriodMetricDelta = {
    key,
    label,
    start,
    end,
    absoluteDelta: end - start,
    relativeRate: computePeriodRelativeRate(start, end),
    unit,
  };
  return result;
}

function resolveFiniteNumber(value: number | null | undefined): number | null {
  let result: number | null = null;

  if (value !== null && value !== undefined && Number.isFinite(value)) {
    result = value;
  }

  return result;
}

export function buildTrendPeriodMetricDeltas(
  start: AggregatedTrendPoint,
  end: AggregatedTrendPoint,
): TrendPeriodMetricDelta[] {
  let result: TrendPeriodMetricDelta[] = [];

  result.push(
    buildMetricDelta(
      "market-value",
      "評価額",
      start.totalMarketValueMinor,
      end.totalMarketValueMinor,
      "yen",
    ),
  );

  result.push(
    buildMetricDelta(
      "unrealized-gain",
      "評価損益",
      start.unrealizedGainMinor,
      end.unrealizedGainMinor,
      "yen",
    ),
  );

  const bookStart = resolveFiniteNumber(start.gainRateOnBook);
  const bookEnd = resolveFiniteNumber(end.gainRateOnBook);
  if (bookStart !== null && bookEnd !== null) {
    result.push(
      buildMetricDelta(
        "gain-rate-book",
        "利益率（簿価）",
        bookStart,
        bookEnd,
        "percentPoint",
      ),
    );
  }

  const contributionsStart = resolveFiniteNumber(start.gainRateOnContributions);
  const contributionsEnd = resolveFiniteNumber(end.gainRateOnContributions);
  if (contributionsStart !== null && contributionsEnd !== null) {
    result.push(
      buildMetricDelta(
        "gain-rate-contributions",
        "利益率（拠出金）",
        contributionsStart,
        contributionsEnd,
        "percentPoint",
      ),
    );
  }

  return result;
}
