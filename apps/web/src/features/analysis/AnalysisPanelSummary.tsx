import { formatAllocationPercent, formatAllocationPercentPoint, formatYen } from "@/lib/format-yen";

type AnalysisPanelSummaryProps = {
  axisTotalMinor: number;
  assetTotalMinor: number;
  targetTotalRatio?: number | null;
};

export function AnalysisPanelSummary({
  axisTotalMinor,
  assetTotalMinor,
  targetTotalRatio = null,
}: AnalysisPanelSummaryProps) {
  const hasUncovered = axisTotalMinor < assetTotalMinor;
  const coverageRatio =
    assetTotalMinor > 0 ? axisTotalMinor / assetTotalMinor : 0;
  const uncoveredMinor = assetTotalMinor - axisTotalMinor;
  const hasTargetTotal =
    targetTotalRatio !== null &&
    targetTotalRatio !== undefined &&
    Number.isFinite(targetTotalRatio);
  let targetHeadroomRatio: number | null = null;

  if (hasTargetTotal && targetTotalRatio < 1 - 0.0001) {
    targetHeadroomRatio = 1 - targetTotalRatio;
  }

  let result = (
    <div className="analysis-panel__summary">
      <p>
        分類対象額: {formatYen(axisTotalMinor)}
        {hasUncovered ? (
          <span>（資産全体の {formatAllocationPercent(coverageRatio)}）</span>
        ) : null}
      </p>
      {hasUncovered ? (
        <p className="analysis-panel__summary-uncovered">
          未分類: {formatYen(uncoveredMinor)}
        </p>
      ) : null}
      {hasTargetTotal ? (
        <p className="analysis-panel__summary-target">
          目標合計: {formatAllocationPercent(targetTotalRatio)}
          {targetHeadroomRatio !== null ? (
            <span className="analysis-panel__summary-target-headroom">
              （未割当 {formatAllocationPercent(targetHeadroomRatio)}）
            </span>
          ) : null}
          {hasUncovered ? (
            <span className="analysis-panel__summary-target-normalized">
              {" "}
              — 差分はタグ付き銘柄内で目標を100%に正規化して比較
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
  return result;
}
