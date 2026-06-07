import {
  findClassificationTagValue,
  IDECO_KAKEIBO_METRIC_CODES,
  type AnalysisSchemeConfig,
  type HoldingLineDto,
} from "@repo/shared";

import {
  formatBookValue,
  formatLineMetric,
  formatMetricLabel,
} from "@/lib/format-holding-line";
import { formatYen } from "@/lib/format-yen";

type HoldingsDetailTableProps = {
  lines: HoldingLineDto[];
  classificationSchemes: AnalysisSchemeConfig[];
};

export function HoldingsDetailTable({
  lines,
  classificationSchemes,
}: HoldingsDetailTableProps) {
  let result = (
    <div className="holdings-table-wrapper">
      <table className="holdings-table">
        <thead>
          <tr>
            <th className="holdings-table__instrument-col">銘柄</th>
            <th>口数</th>
            <th>
              {formatMetricLabel(
                IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
              )}
            </th>
            <th>資産残高</th>
            <th>購入金額</th>
            <th>
              {formatMetricLabel(
                IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
              )}
            </th>
            <th>
              {formatMetricLabel(
                IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
              )}
            </th>
            {classificationSchemes.map((scheme) => {
              let header = (
                <th
                  key={scheme.schemeCode}
                  className="holdings-table__classification-col"
                >
                  {scheme.schemeName}
                </th>
              );
              return header;
            })}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            let row = (
              <tr key={line.id}>
                <td className="holdings-table__instrument-col">
                  {line.instrumentName}
                </td>
                <td>{line.quantity}</td>
                <td>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
                  )}
                </td>
                <td>{formatYen(line.marketValueMinor)}</td>
                <td>{formatBookValue(line.bookValueMinor)}</td>
                <td>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                  )}
                </td>
                <td>
                  {formatLineMetric(
                    line.metrics,
                    IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
                  )}
                </td>
                {classificationSchemes.map((scheme) => {
                  const value =
                    findClassificationTagValue(line.tags, scheme.schemeCode) ??
                    "—";
                  let cell = (
                    <td
                      key={scheme.schemeCode}
                      className="holdings-table__classification-col"
                    >
                      {value}
                    </td>
                  );
                  return cell;
                })}
              </tr>
            );
            return row;
          })}
        </tbody>
      </table>
    </div>
  );
  return result;
}
