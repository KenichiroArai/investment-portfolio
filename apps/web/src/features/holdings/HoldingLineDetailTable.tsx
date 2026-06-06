import {
  IDECO_KAKEIBO_METRIC_CODES,
  type HoldingLineMetricDto,
} from "@repo/shared";

import {
  formatLineMetric,
  formatMetricLabel,
} from "@/lib/format-holding-line";
import { formatPercent, formatYen } from "@/lib/format-yen";

export const HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL = "分類内構成比";

export type HoldingLineDetailRow = {
  id: string;
  instrumentName: string;
  quantity: number;
  marketValueMinor: number;
  weight: number;
  metrics: HoldingLineMetricDto[];
  portfolioName?: string;
};

type HoldingLineDetailTableProps = {
  rows: HoldingLineDetailRow[];
  weightColumnLabel: string;
  showPortfolioColumn?: boolean;
  className?: string;
};

export function HoldingLineDetailTable({
  rows,
  weightColumnLabel,
  showPortfolioColumn = false,
  className = "holding-line-detail-table",
}: HoldingLineDetailTableProps) {
  let result = (
    <table className={className}>
      <thead>
        <tr>
          {showPortfolioColumn ? <th>口座</th> : null}
          <th>銘柄</th>
          <th>口数</th>
          <th>評価額</th>
          <th>{weightColumnLabel}</th>
          <th>{formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor)}</th>
          <th>{formatMetricLabel(IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          let tableRow = (
            <tr key={row.id}>
              {showPortfolioColumn ? (
                <td>{row.portfolioName ?? "—"}</td>
              ) : null}
              <td>{row.instrumentName}</td>
              <td>{row.quantity}</td>
              <td>{formatYen(row.marketValueMinor)}</td>
              <td>{formatPercent(row.weight)}</td>
              <td>
                {formatLineMetric(
                  row.metrics,
                  IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
                )}
              </td>
              <td>
                {formatLineMetric(
                  row.metrics,
                  IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
                )}
              </td>
            </tr>
          );
          return tableRow;
        })}
      </tbody>
    </table>
  );
  return result;
}
