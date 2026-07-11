const UTF8_BOM = "\uFEFF";

export function escapeCsvCell(value: string): string {
  let result = value;

  if (result.includes('"') || result.includes(",") || result.includes("\n") || result.includes("\r")) {
    result = `"${result.replace(/"/g, '""')}"`;
  }

  return result;
}

export function serializeCsvRow(cells: string[]): string {
  let result = "";
  result = cells.map((cell) => escapeCsvCell(cell)).join(",");
  return result;
}

export function serializeCsvTable(headers: string[], rows: string[][]): string {
  let result = UTF8_BOM;
  const lines: string[] = [serializeCsvRow(headers)];

  for (const row of rows) {
    lines.push(serializeCsvRow(row));
  }

  result += `${lines.join("\n")}\n`;
  return result;
}

export function parseQuotedCsvLine(line: string): string[] {
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

export function normalizeCsvContent(content: string): string {
  let result = content;

  if (result.startsWith(UTF8_BOM)) {
    result = result.slice(UTF8_BOM.length);
  }

  result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return result;
}

export function parseCsv(content: string): string[][] {
  let result: string[][] = [];
  const normalized = normalizeCsvContent(content);
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    result.push(parseQuotedCsvLine(line));
  }

  return result;
}

export function parseCsvTable(content: string): { headers: string[]; rows: Record<string, string>[] } {
  let result: { headers: string[]; rows: Record<string, string>[] } = {
    headers: [],
    rows: [],
  };
  const table = parseCsv(content);

  if (table.length === 0) {
    return result;
  }

  const headers = table[0].map((header) => header.trim());
  result.headers = headers;

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex];
    const row: Record<string, string> = {};

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      row[headers[columnIndex]] = cells[columnIndex] ?? "";
    }

    result.rows.push(row);
  }

  return result;
}
