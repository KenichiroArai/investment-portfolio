import {
  buildIdecoPortfolioMetricInput,
  resolveIdecoPortfolioMetricCode,
} from "./ideco-portfolio-metrics";
import { IdecoCsvError, parseCsvRecords, parseJapaneseInteger, stripUtf8Bom } from "./ideco-csv-utils";
import type { PortfolioSnapshotMetricInput } from "./portfolio-snapshot-metrics";

export const IDECO_GENERIC_CSV_HEADERS = ["汎用名", "汎用値"] as const;

export type ParseIdecoGenericCsvResult = {
  metrics: PortfolioSnapshotMetricInput[];
};

export function parseIdecoGenericCsv(content: string): ParseIdecoGenericCsvResult {
  let result: ParseIdecoGenericCsvResult = { metrics: [] };

  const normalized = stripUtf8Bom(content).trim();
  if (normalized === "") {
    throw new IdecoCsvError("汎用 CSV が空です");
  }

  const records = parseCsvRecords(normalized);
  if (records.length < 2) {
    throw new IdecoCsvError("汎用 CSV にデータ行がありません");
  }

  const header = records[0].map((cell) => cell.trim());
  if (
    header.length !== IDECO_GENERIC_CSV_HEADERS.length ||
    header[0] !== IDECO_GENERIC_CSV_HEADERS[0] ||
    header[1] !== IDECO_GENERIC_CSV_HEADERS[1]
  ) {
    throw new IdecoCsvError(
      `汎用 CSV のヘッダーが不正です（期待「${IDECO_GENERIC_CSV_HEADERS.join(",")}」、実際「${header.join(",")}」）`,
    );
  }

  const metrics: PortfolioSnapshotMetricInput[] = [];
  const seenLabels = new Set<string>();

  for (let index = 1; index < records.length; index += 1) {
    const lineNumber = index + 1;
    const label = records[index][0]?.trim() ?? "";
    const valueText = records[index][1]?.trim() ?? "";

    if (label === "") {
      continue;
    }

    if (seenLabels.has(label)) {
      throw new IdecoCsvError(
        `汎用 CSV ${lineNumber} 行目: 汎用名「${label}」が重複しています`,
      );
    }
    seenLabels.add(label);

    const code = resolveIdecoPortfolioMetricCode(label);
    if (!code) {
      throw new IdecoCsvError(
        `汎用 CSV ${lineNumber} 行目: 未知の汎用名「${label}」`,
      );
    }

    const integerValue = parseJapaneseInteger(valueText);
    if (!Number.isFinite(integerValue)) {
      throw new IdecoCsvError(
        `汎用 CSV ${lineNumber} 行目: 汎用値が不正です（「${valueText}」）`,
      );
    }

    metrics.push(
      buildIdecoPortfolioMetricInput({
        code,
        integerValue,
      }),
    );
  }

  if (metrics.length === 0) {
    throw new IdecoCsvError("汎用 CSV に有効な行がありません");
  }

  result = { metrics };
  return result;
}
