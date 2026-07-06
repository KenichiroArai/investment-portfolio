export class MonexCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonexCsvError";
  }
}

export function parseMonexQuotedCsvLine(line: string): string[] {
  let result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

export function parseMonexCsv(content: string): string[][] {
  let result: string[][] = [];
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    result.push(parseMonexQuotedCsvLine(line));
  }

  return result;
}

export function parseMonexDate(value: string): string {
  let result = "";

  const trimmed = value.trim();
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(trimmed);
  if (!match) {
    return result;
  }

  result = `${match[1]}-${match[2]}-${match[3]}`;
  return result;
}

export function parseMonexInteger(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-") {
    return result;
  }

  result = Number.parseInt(normalized, 10);
  return result;
}

export function parseMonexDecimalRate(value: string): number {
  let result = Number.NaN;

  const normalized = value.trim().replace(/,/g, "");
  if (normalized === "" || normalized === "-" || normalized.startsWith("---")) {
    return result;
  }

  result = Number.parseFloat(normalized);
  return result;
}

export function indexMonexHeaders(headers: string[]): Map<string, number> {
  let result = new Map<string, number>();

  headers.forEach((header, index) => {
    result.set(header.trim(), index);
  });

  return result;
}

export function requireMonexHeader(
  headerIndex: Map<string, number>,
  label: string,
): number {
  let result = headerIndex.get(label);

  if (result === undefined) {
    throw new MonexCsvError(`必須列が見つかりません: ${label}`);
  }

  return result;
}
