import {
  IDECO_KAKEIBO_METRIC_CODES,
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
};

function formatClassificationTags(tags: HoldingLineDto["tags"]): string {
  let result = "—";

  if (tags.length === 0) {
    return result;
  }

  result = tags
    .map((tag) => {
      let label = `${tag.schemeName}: ${tag.valueName}`;
      return label;
    })
    .join(" / ");
  return result;
}

export function HoldingsDetailTable({ lines }: HoldingsDetailTableProps) {
  let result = (
    <table className="holdings-table">
      <thead>
        <tr>
          <th>銘柄</th>
          <th>口数</th>
          <th>
            {formatMetricLabel(
              IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            )}
          </th>
          <th>資産残高</th>
          <th>購入金額</th>
          <th>
            {formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor)}
          </th>
          <th>
            {formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate)}
          </th>
          <th>分類</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => {
          let row = (
            <tr key={line.id}>
              <td>{line.instrumentName}</td>
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
              <td>{formatClassificationTags(line.tags)}</td>
            </tr>
          );
          return row;
        })}
      </tbody>
    </table>
  );
  return result;
}
