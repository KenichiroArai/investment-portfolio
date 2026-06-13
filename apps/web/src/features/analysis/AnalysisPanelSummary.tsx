import { formatPercent, formatYen } from "@/lib/format-yen";

type AnalysisPanelSummaryProps = {
  axisTotalMinor: number;
  assetTotalMinor: number;
};

export function AnalysisPanelSummary({
  axisTotalMinor,
  assetTotalMinor,
}: AnalysisPanelSummaryProps) {
  const hasUncovered = axisTotalMinor < assetTotalMinor;
  const coverageRatio =
    assetTotalMinor > 0 ? axisTotalMinor / assetTotalMinor : 0;
  const uncoveredMinor = assetTotalMinor - axisTotalMinor;

  let result = (
    <div className="analysis-panel__summary">
      <p>
        分類対象額: {formatYen(axisTotalMinor)}
        {hasUncovered ? (
          <span>（資産全体の {formatPercent(coverageRatio)}）</span>
        ) : null}
      </p>
      {hasUncovered ? (
        <p className="analysis-panel__summary-uncovered">
          未分類: {formatYen(uncoveredMinor)}
        </p>
      ) : null}
    </div>
  );
  return result;
}
