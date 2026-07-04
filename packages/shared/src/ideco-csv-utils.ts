export class IdecoCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdecoCsvError";
  }
}

export function stripUtf8Bom(content: string): string {
  let result = content;
  if (result.charCodeAt(0) === 0xfeff) {
    result = result.slice(1);
  }
  return result;
}

export function parseJapanesePercentRate(value: string): number {
  let result = Number.NaN;

  const trimmed = value.trim();
  let withoutSuffix = trimmed;
  if (trimmed.endsWith("％")) {
    withoutSuffix = trimmed.slice(0, -1).trim();
  } else if (trimmed.endsWith("%")) {
    withoutSuffix = trimmed.slice(0, -1).trim();
  } else {
    return result;
  }

  const normalized = withoutSuffix.replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return result;
  }

  const percent = Number.parseFloat(normalized);
  if (!Number.isFinite(percent)) {
    return result;
  }

  result = percent / 100;
  return result;
}

export function parseDecimalRate(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return result;
  }

  result = Number.parseFloat(normalized);
  return result;
}

export function parseGainRate(value: string): number {
  let result = parseJapanesePercentRate(value);
  if (Number.isFinite(result)) {
    return result;
  }

  result = parseDecimalRate(value);
  return result;
}
