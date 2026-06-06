import { resolveIdecoProductType } from "./ideco-analysis";
import { IdecoCsvError, parseCsvRecords, stripUtf8Bom } from "./ideco-csv-utils";

export const IDECO_PRODUCT_TYPES_CSV_HEADER = "商品タイプ";

export type IdecoProductTypeCsvRow = {
  name: string;
  code: string;
  sortOrder: number;
};

export type ParseIdecoProductTypesCsvResult = {
  rows: IdecoProductTypeCsvRow[];
};

export function parseIdecoProductTypesCsv(
  content: string,
): ParseIdecoProductTypesCsvResult {
  let result: ParseIdecoProductTypesCsvResult = { rows: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("商品タイプ CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("商品タイプ CSV にデータ行がありません");
  }

  const header = records[0][0]?.trim();
  if (header !== IDECO_PRODUCT_TYPES_CSV_HEADER) {
    throw new IdecoCsvError(
      `商品タイプ CSV のヘッダーが不正です（期待「${IDECO_PRODUCT_TYPES_CSV_HEADER}」、実際「${header ?? ""}」）`,
    );
  }

  const rows: IdecoProductTypeCsvRow[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    const name = records[index][0]?.trim() ?? "";
    if (name === "") {
      continue;
    }

    const definition = resolveIdecoProductType(name);
    rows.push({
      name: definition.name,
      code: definition.code,
      sortOrder: rows.length,
    });
  }

  if (rows.length === 0) {
    throw new IdecoCsvError("商品タイプ CSV に有効な行がありません");
  }

  result = { rows };
  return result;
}
