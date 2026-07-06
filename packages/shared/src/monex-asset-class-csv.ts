import {
  indexMonexHeaders,
  parseMonexCsv,
  requireMonexHeader,
} from "./monex-csv-utils";

export type MonexAssetClassCsvRow = {
  instrumentName: string;
};

export type ParseMonexAssetClassCsvResult = {
  rows: MonexAssetClassCsvRow[];
};

export function parseMonexAssetClassCsv(
  content: string,
): ParseMonexAssetClassCsvResult {
  let result: ParseMonexAssetClassCsvResult = { rows: [] };

  const table = parseMonexCsv(content);
  if (table.length < 2) {
    return result;
  }

  const headerIndex = indexMonexHeaders(table[0]);
  const nameIndex = requireMonexHeader(headerIndex, "銘柄");

  for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
    const cells = table[rowIndex];
    const instrumentName = cells[nameIndex]?.trim() ?? "";
    if (instrumentName === "") {
      continue;
    }

    let row: MonexAssetClassCsvRow = {
      instrumentName,
    };
    result.rows.push(row);
  }

  return result;
}

export function buildMonexAssetClassNameMap(
  entries: Array<{ fileName: string; content: string }>,
  fileMap: Record<string, { code: string; name: string }>,
): Map<string, string> {
  let result = new Map<string, string>();

  for (const entry of entries) {
    const assetClass = fileMap[entry.fileName];
    if (!assetClass) {
      continue;
    }

    const parsed = parseMonexAssetClassCsv(entry.content);
    for (const row of parsed.rows) {
      result.set(row.instrumentName, assetClass.code);
    }
  }

  return result;
}
