export type TrendPeriodDeltaOptions = {
  baseline?: number | null;
};

export function computeTrendPeriodDeltas(
  values: Array<number | null>,
  options?: TrendPeriodDeltaOptions,
): Array<number | null> {
  let result: Array<number | null> = [];
  const baseline = options?.baseline ?? null;

  for (let index = 0; index < values.length; index += 1) {
    if (index === 0) {
      if (
        baseline !== null &&
        Number.isFinite(baseline) &&
        values[0] !== null &&
        Number.isFinite(values[0])
      ) {
        result.push(values[0] - baseline);
        continue;
      }
      result.push(null);
      continue;
    }

    const previous = values[index - 1];
    const current = values[index];

    if (
      previous === null ||
      current === null ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current)
    ) {
      result.push(null);
      continue;
    }

    result.push(current - previous);
  }

  return result;
}

export function computeTrendPeriodRelativeDeltas(
  values: Array<number | null>,
  options?: TrendPeriodDeltaOptions,
): Array<number | null> {
  let result: Array<number | null> = [];
  const baseline = options?.baseline ?? null;

  for (let index = 0; index < values.length; index += 1) {
    if (index === 0) {
      if (
        baseline !== null &&
        Number.isFinite(baseline) &&
        baseline !== 0 &&
        values[0] !== null &&
        Number.isFinite(values[0])
      ) {
        result.push((values[0] - baseline) / Math.abs(baseline));
        continue;
      }
      result.push(null);
      continue;
    }

    const previous = values[index - 1];
    const current = values[index];

    if (
      previous === null ||
      current === null ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      previous === 0
    ) {
      result.push(null);
      continue;
    }

    result.push((current - previous) / Math.abs(previous));
  }

  return result;
}
