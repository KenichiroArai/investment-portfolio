import { resolveIdecoAnalysisTags, resolveIdecoProductType } from "./ideco-analysis";
import { IdecoCsvError, parseCsvRecords, stripUtf8Bom } from "./ideco-csv-utils";

export const IDECO_ANALYSIS_CSV_HEADERS = [
  "分析軸名",
  "カテゴリ名",
  "メンバー名",
  "",
  "",
  "",
  "",
  "",
  "商品タイプ",
  "地域分類",
  "資産分類",
] as const;

export type IdecoAnalysisMappingRow = {
  productTypeName: string;
  productTypeCode: string;
  regionName: string;
  assetClassName: string;
};

export type ParseIdecoAnalysisCsvResult = {
  mappings: IdecoAnalysisMappingRow[];
};

function assertAnalysisHeader(headerRow: string[]): void {
  let result: void = undefined;

  if (headerRow.length < IDECO_ANALYSIS_CSV_HEADERS.length) {
    throw new IdecoCsvError(
      `分析 CSV ヘッダー列数が不正です（期待: ${IDECO_ANALYSIS_CSV_HEADERS.length} 以上）`,
    );
  }

  for (let index = 0; index < IDECO_ANALYSIS_CSV_HEADERS.length; index += 1) {
    const expected = IDECO_ANALYSIS_CSV_HEADERS[index];
    if (expected === "") {
      continue;
    }
    const actual = headerRow[index]?.trim() ?? "";
    if (actual !== expected) {
      throw new IdecoCsvError(
        `分析 CSV ヘッダーが不正です（列 ${index + 1}: 期待「${expected}」、実際「${actual}」）`,
      );
    }
  }

  return result;
}

export function parseIdecoAnalysisCsv(content: string): ParseIdecoAnalysisCsvResult {
  let result: ParseIdecoAnalysisCsvResult = { mappings: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("分析 CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("分析 CSV にデータ行がありません");
  }

  assertAnalysisHeader(records[0]);

  const mappings: IdecoAnalysisMappingRow[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    const cells = records[index];
    const productTypeName = cells[8]?.trim() ?? "";
    const regionName = cells[9]?.trim() ?? "";
    const assetClassName = cells[10]?.trim() ?? "";

    if (productTypeName === "") {
      continue;
    }

    const productType = resolveIdecoProductType(productTypeName);
    const derived = resolveIdecoAnalysisTags(productType.code);
    if (!derived) {
      throw new IdecoCsvError(
        `${lineNumber} 行目の商品タイプに分析導出ルールがありません: ${productTypeName}`,
      );
    }

    if (regionName === "" || assetClassName === "") {
      throw new IdecoCsvError(`${lineNumber} 行目の地域分類または資産分類が空です`);
    }

    mappings.push({
      productTypeName: productType.name,
      productTypeCode: productType.code,
      regionName,
      assetClassName,
    });
  }

  if (mappings.length === 0) {
    throw new IdecoCsvError("分析 CSV に有効な導出行がありません");
  }

  result = { mappings };
  return result;
}
