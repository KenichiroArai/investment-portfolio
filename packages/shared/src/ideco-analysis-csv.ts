import {
  resolveIdecoAnalysisAxisSchemeCode,
  resolveIdecoAnalysisCategoryDefinition,
  resolveIdecoProductType,
} from "./ideco-analysis";
import { IdecoCsvError, parseCsvRecords, stripUtf8Bom } from "./ideco-csv-utils";

export const IDECO_ANALYSIS_CSV_HEADERS = [
  "分析軸名",
  "カテゴリ名",
  "メンバー名",
] as const;

export const IDECO_ANALYSIS_CSV_LEGACY_HEADERS = [
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

export type IdecoAnalysisAxis = {
  axisName: string;
  schemeCode: string;
  sortOrder: number;
};

export type IdecoAnalysisMemberMapping = {
  axisName: string;
  schemeCode: string;
  memberName: string;
  categoryName: string;
  categoryCode: string;
};

/** @deprecated 旧形式との互換用。新形式では axes / memberMappings を利用してください。 */
export type IdecoAnalysisMappingRow = {
  productTypeName: string;
  productTypeCode: string;
  regionName: string;
  assetClassName: string;
};

export type ParseIdecoAnalysisCsvResult = {
  axes: IdecoAnalysisAxis[];
  memberMappings: IdecoAnalysisMemberMapping[];
  mappings: IdecoAnalysisMappingRow[];
};

function assertHeader(
  headerRow: string[],
  expectedHeaders: readonly string[],
  formatLabel: string,
): void {
  let result: void = undefined;

  if (headerRow.length < expectedHeaders.length) {
    throw new IdecoCsvError(
      `分析 CSV ヘッダー列数が不正です（${formatLabel}: ${expectedHeaders.length} 以上）`,
    );
  }

  for (let index = 0; index < expectedHeaders.length; index += 1) {
    const expected = expectedHeaders[index];
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

function isLegacyAnalysisHeader(headerRow: string[]): boolean {
  let result = false;

  if (headerRow.length < IDECO_ANALYSIS_CSV_LEGACY_HEADERS.length) {
    return result;
  }

  for (let index = 8; index < IDECO_ANALYSIS_CSV_LEGACY_HEADERS.length; index += 1) {
    const expected = IDECO_ANALYSIS_CSV_LEGACY_HEADERS[index];
    const actual = headerRow[index]?.trim() ?? "";
    if (actual !== expected) {
      return result;
    }
  }

  result = true;
  return result;
}

function pushAxis(
  axes: IdecoAnalysisAxis[],
  axisNames: string[],
  axisName: string,
): void {
  let result: void = undefined;

  const trimmed = axisName.trim();
  if (trimmed === "") {
    return result;
  }

  if (axisNames.includes(trimmed)) {
    return result;
  }

  axisNames.push(trimmed);
  axes.push({
    axisName: trimmed,
    schemeCode: resolveIdecoAnalysisAxisSchemeCode(trimmed),
    sortOrder: axes.length,
  });

  return result;
}

function pushMemberMapping(
  memberMappings: IdecoAnalysisMemberMapping[],
  axisName: string,
  categoryName: string,
  memberName: string,
): void {
  let result: void = undefined;

  const trimmedMember = memberName.trim();
  if (trimmedMember === "" || trimmedMember === "all") {
    return result;
  }

  const schemeCode = resolveIdecoAnalysisAxisSchemeCode(axisName);
  const category = resolveIdecoAnalysisCategoryDefinition(schemeCode, categoryName);
  memberMappings.push({
    axisName: axisName.trim(),
    schemeCode,
    memberName: trimmedMember,
    categoryName: category.name,
    categoryCode: category.code,
  });

  return result;
}

function parseLegacyAnalysisRows(records: string[][]): ParseIdecoAnalysisCsvResult {
  let result: ParseIdecoAnalysisCsvResult = {
    axes: [],
    memberMappings: [],
    mappings: [],
  };

  const axisNames: string[] = [];
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
    if (regionName === "" || assetClassName === "") {
      throw new IdecoCsvError(`${lineNumber} 行目の地域分類または資産分類が空です`);
    }

    pushAxis(result.axes, axisNames, "地域分類");
    pushAxis(result.axes, axisNames, "資産分類");
    pushMemberMapping(
      result.memberMappings,
      "地域分類",
      regionName,
      productType.name,
    );
    pushMemberMapping(
      result.memberMappings,
      "資産分類",
      assetClassName,
      productType.name,
    );

    mappings.push({
      productTypeName: productType.name,
      productTypeCode: productType.code,
      regionName,
      assetClassName,
    });
  }

  if (result.memberMappings.length === 0) {
    throw new IdecoCsvError("分析 CSV に有効な導出行がありません");
  }

  result.mappings = mappings;
  return result;
}

function parseModernAnalysisRows(records: string[][]): ParseIdecoAnalysisCsvResult {
  let result: ParseIdecoAnalysisCsvResult = {
    axes: [],
    memberMappings: [],
    mappings: [],
  };

  const axisNames: string[] = [];
  const mappings: IdecoAnalysisMappingRow[] = [];

  for (let index = 1; index < records.length; index += 1) {
    const cells = records[index];
    const axisName = cells[0]?.trim() ?? "";
    const categoryName = cells[1]?.trim() ?? "";
    const memberName = cells[2]?.trim() ?? "";

    if (axisName === "") {
      continue;
    }

    pushAxis(result.axes, axisNames, axisName);
    pushMemberMapping(result.memberMappings, axisName, categoryName, memberName);

    if (memberName === "" || memberName === "all") {
      continue;
    }

    const productType = resolveIdecoProductType(memberName);
    const regionMapping = result.memberMappings.find(
      (mapping) =>
        mapping.memberName === productType.name &&
        mapping.schemeCode === resolveIdecoAnalysisAxisSchemeCode("地域分類"),
    );
    const assetMapping = result.memberMappings.find(
      (mapping) =>
        mapping.memberName === productType.name &&
        mapping.schemeCode === resolveIdecoAnalysisAxisSchemeCode("資産分類"),
    );
    if (regionMapping && assetMapping) {
      mappings.push({
        productTypeName: productType.name,
        productTypeCode: productType.code,
        regionName: regionMapping.categoryName,
        assetClassName: assetMapping.categoryName,
      });
    }
  }

  if (result.memberMappings.length === 0) {
    throw new IdecoCsvError("分析 CSV に有効な導出行がありません");
  }

  result.mappings = mappings;
  return result;
}

export function parseIdecoAnalysisCsv(content: string): ParseIdecoAnalysisCsvResult {
  let result: ParseIdecoAnalysisCsvResult = {
    axes: [],
    memberMappings: [],
    mappings: [],
  };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("分析 CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("分析 CSV にデータ行がありません");
  }

  if (isLegacyAnalysisHeader(records[0])) {
    assertHeader(records[0], IDECO_ANALYSIS_CSV_LEGACY_HEADERS, "旧形式");
    result = parseLegacyAnalysisRows(records);
    return result;
  }

  assertHeader(records[0], IDECO_ANALYSIS_CSV_HEADERS, "新形式");
  result = parseModernAnalysisRows(records);
  return result;
}
