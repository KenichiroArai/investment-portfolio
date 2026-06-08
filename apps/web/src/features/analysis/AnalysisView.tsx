"use client";

import Link from "next/link";
import {
  buildAllocationBySchemeWithLines,
  resolveAnalysisSchemes,
  sumSnapshotMarketValue,
  type AnalysisSchemeConfig,
} from "@repo/shared";
import { useState, type ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { AnalysisPanelSummary } from "@/features/analysis/AnalysisPanelSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";

type AnalysisViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function AnalysisView({
  portfolioCode,
  portfolioKind,
}: AnalysisViewProps) {
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");
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
    result = (
      <main>
        <p>読み込み中…</p>
      </main>
    );
    return result;
  }

  if (error) {
    result = (
      <main>
        <h1>分析</h1>
        <p className="holdings-error">{error}</p>
      </main>
    );
    return result;
  }

  if (!snapshot) {
    result = (
      <main>
        <h1>分析</h1>
        <p className="holdings-error">分析対象の明細がありません。</p>
      </main>
    );
    return result;
  }

  const schemeConfigs = resolveAnalysisSchemes(snapshot, portfolioKind);
  const activeSchemeCode = (() => {
    let activeResult = schemeConfigs[0]?.schemeCode ?? "";

    const selected = schemeConfigs.find(
      (config) => config.schemeCode === selectedSchemeCode,
    );
    if (selected) {
      activeResult = selected.schemeCode;
    }

    return activeResult;
  })();

  if (schemeConfigs.length === 0) {
    result = (
      <main>
        <h1>分析</h1>
        <p className="note">この口座種別の分析軸はまだ定義されていません。</p>
      </main>
    );
    return result;
  }

  const activeScheme = schemeConfigs.find(
    (config) => config.schemeCode === activeSchemeCode,
  ) as AnalysisSchemeConfig;
  const allocation = buildAllocationBySchemeWithLines(
    snapshot.lines,
    activeScheme.schemeCode,
    activeScheme.schemeName,
  );
  const totalValue = sumSnapshotMarketValue(snapshot.lines);

  result = (
    <main className="analysis-page">
      <div className="analysis-page__header">
        <div>
          <h1>
            分析 — {snapshot.portfolioName}（{snapshot.portfolioCode}）
          </h1>
          <p className="holdings-meta">
            基準日: {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
            {isHistoricalView ? (
              <span className="snapshot-time-bar__badge">履歴表示中</span>
            ) : null}
          </p>
          <p className="analysis-page__total">評価額合計: {formatYen(totalValue)}</p>
        </div>
        <p className="note">
          <Link href={`/portfolios/${portfolioCode}/analysis/settings/`}>
            分析設定（準備中）
          </Link>
        </p>
      </div>
      <div className="analysis-axis-tabs" role="tablist" aria-label="分析軸">
        {schemeConfigs.map((config) => {
          let tab = (
            <button
              key={config.schemeCode}
              type="button"
              role="tab"
              aria-selected={config.schemeCode === activeSchemeCode}
              className={
                config.schemeCode === activeSchemeCode ? "is-active" : undefined
              }
              onClick={() => {
                setSelectedSchemeCode(config.schemeCode);
              }}
            >
              {config.schemeName}
            </button>
          );
          return tab;
        })}
      </div>
      <section className="analysis-panel">
        <h2>{activeScheme.schemeName}</h2>
        <AnalysisPanelSummary
          axisTotalMinor={allocation.totalMarketValueMinor}
          assetTotalMinor={totalValue}
        />
        <AllocationPanel slices={allocation.slices} />
      </section>
    </main>
  );
  return result;
}
