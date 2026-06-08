"use client";

import { collectHoldingsClassificationSchemes } from "@repo/shared";
import type { ReactNode } from "react";

import { HoldingsDetailTable } from "@/features/holdings/HoldingsDetailTable";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { formatAsOfDateJa } from "@/lib/format-yen";

type HoldingsViewProps = {
  portfolioCode: string;
};

export function HoldingsView({ portfolioCode }: HoldingsViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot) {
    result = <p>読み込み中…</p>;
    return result;
  }

  if (error) {
    result = <p className="holdings-error">{error}</p>;
    return result;
  }

  if (!snapshot) {
    result = <p className="holdings-error">明細がまだ登録されていません。</p>;
    return result;
  }

  result = (
    <section className="holdings">
      <h1>
        {snapshot.portfolioName}（{snapshot.portfolioCode}）
      </h1>
      <p className="holdings-meta">
        基準日: {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
        {isHistoricalView ? (
          <span className="snapshot-time-bar__badge">履歴表示中</span>
        ) : null}
      </p>
      {snapshot.lines.length === 0 ? (
        <p>保有銘柄がありません。</p>
      ) : (
        <HoldingsDetailTable
          lines={snapshot.lines}
          classificationSchemes={collectHoldingsClassificationSchemes(
            snapshot.analysisSchemes,
            snapshot.lines,
          )}
        />
      )}
    </section>
  );
  return result;
}
