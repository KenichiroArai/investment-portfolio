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

export function stableIdecoCodeSuffix(label: string): string {
  let result = "";

  let hash = 0x811c9dc5;
  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  result = (hash >>> 0).toString(16).padStart(8, "0");
  return result;
}

export function parseJapaneseInteger(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return result;
  }

  result = Number.parseInt(normalized, 10);
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

export function parseIdecoDate(value: string): string {
  let result = "";

  const trimmed = value.trim();
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (!match) {
    throw new IdecoCsvError(`日付の形式が不正です: ${value}`);
  }

  const year = match[1];
  const month = match[2].padStart(2, "0");
  const day = match[3].padStart(2, "0");
  result = `${year}-${month}-${day}`;
  return result;
}

export function parseCsvRecords(content: string): string[][] {
  let result: string[][] = [];
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (inQuotes) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRecord.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n" || character === "\r") {
      if (character === "\r" && content[index + 1] === "\n") {
        index += 1;
      }
      currentRecord.push(currentField);
      if (currentRecord.some((cell) => cell.length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentField = "";
      continue;
    }

    currentField += character;
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  result = records;
  return result;
}
