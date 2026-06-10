export type NiceAxisScale = {
  min: number;
  max: number;
  ticks: number[];
};

type BuildNiceAxisScaleOptions = {
  maxTicks?: number;
};

const NICE_STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10];

function pickNiceStep(roughStep: number): number {
  let result = 1;

  if (!Number.isFinite(roughStep) || roughStep <= 0) {
    return result;
  }

  const exponent = Math.floor(Math.log10(roughStep));
  const magnitude = 10 ** exponent;
  const fraction = roughStep / magnitude;
  let niceFraction = 10;

  for (const candidate of NICE_STEP_MULTIPLIERS) {
    if (fraction <= candidate) {
      niceFraction = candidate;
      break;
    }
  }

  result = niceFraction * magnitude;
  return result;
}

function countTicks(min: number, max: number, step: number): number {
  let result = 1;

  if (!Number.isFinite(step) || step <= 0) {
    return result;
  }

  result = Math.floor((max - min) / step) + 1;
  return result;
}

function resolveTickPrecision(step: number): number {
  let result = 0;

  if (!Number.isFinite(step) || step <= 0) {
    return result;
  }

  const stepText = step.toString();
  const decimalIndex = stepText.indexOf(".");

  if (decimalIndex === -1) {
    return result;
  }

  result = stepText.length - decimalIndex - 1;
  return result;
}

function roundTick(value: number, step: number): number {
  let result = value;
  const precision = resolveTickPrecision(step);

  if (precision > 0) {
    const factor = 10 ** precision;
    result = Math.round(value * factor) / factor;
    return result;
  }

  result = Math.round(value);
  return result;
}

function buildTicks(min: number, max: number, step: number): number[] {
  let result: number[] = [];

  if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0) {
    return result;
  }

  for (let value = min; value <= max + step * 1e-9; value += step) {
    result.push(roundTick(value, step));
  }

  return result;
}

function buildSingleValueScale(
  value: number,
  maxTicks: number,
): NiceAxisScale {
  let result: NiceAxisScale = { min: 0, max: 1, ticks: [0, 1] };

  if (value === 0) {
    return result;
  }

  if (value > 0) {
    const step = pickNiceStep(value / Math.max(maxTicks - 1, 1));
    const niceMax = Math.ceil(value / step) * step;
    result = {
      min: 0,
      max: niceMax,
      ticks: buildTicks(0, niceMax, step),
    };
    return result;
  }

  const step = pickNiceStep(Math.abs(value) / Math.max(maxTicks - 1, 1));
  const niceMin = Math.floor(value / step) * step;
  result = {
    min: niceMin,
    max: 0,
    ticks: buildTicks(niceMin, 0, step),
  };
  return result;
}

function resolveDefaultMaxTicks(rawMin: number, rawMax: number): number {
  let result = 6;

  if (rawMin === 0 && rawMax === 1) {
    result = 5;
    return result;
  }

  return result;
}

function coarsenAxisScaleStep(
  rawMin: number,
  rawMax: number,
  step: number,
  niceMin: number,
  niceMax: number,
  maxTicks: number,
  pickStep: (roughStep: number) => number = pickNiceStep,
): { step: number; niceMin: number; niceMax: number } {
  let result = { step, niceMin, niceMax };

  while (countTicks(result.niceMin, result.niceMax, result.step) > maxTicks) {
    const nextStep = pickStep(result.step * 1.001);
    if (nextStep <= result.step) {
      result.step = result.step * 2;
    } else {
      result.step = nextStep;
    }
    result.niceMin = Math.floor(rawMin / result.step) * result.step;
    result.niceMax = Math.ceil(rawMax / result.step) * result.step;
  }

  return result;
}

export function buildNiceAxisScale(
  rawMin: number,
  rawMax: number,
  options: BuildNiceAxisScaleOptions = {},
): NiceAxisScale {
  const maxTicks = options.maxTicks ?? resolveDefaultMaxTicks(rawMin, rawMax);
  let result: NiceAxisScale = {
    min: rawMin,
    max: rawMax,
    ticks: [rawMin],
  };

  if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax)) {
    return result;
  }

  if (rawMin === rawMax) {
    result = buildSingleValueScale(rawMin, maxTicks);
    return result;
  }

  const range = rawMax - rawMin;
  let step = pickNiceStep(range / Math.max(maxTicks - 1, 1));
  let niceMin = Math.floor(rawMin / step) * step;
  let niceMax = Math.ceil(rawMax / step) * step;

  ({ step, niceMin, niceMax } = coarsenAxisScaleStep(
    rawMin,
    rawMax,
    step,
    niceMin,
    niceMax,
    maxTicks,
  ));

  result = {
    min: niceMin,
    max: niceMax,
    ticks: buildTicks(niceMin, niceMax, step),
  };
  return result;
}

export const __chartAxisScaleTesting = {
  pickNiceStep,
  countTicks,
  resolveTickPrecision,
  roundTick,
  buildTicks,
  buildSingleValueScale,
  coarsenAxisScaleStep,
};
