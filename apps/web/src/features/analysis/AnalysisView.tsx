"use client";

import Link from "next/link";
import {
  buildAllocationBySchemeWithLines,
  listAnalysisSchemesForPortfolio,
  sumSnapshotMarketValue,
  type AnalysisSchemeConfig,
  type CurrentSnapshotDto,
} from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { formatYen } from "@/lib/format-yen";
import {
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";

type AnalysisViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function AnalysisView({
  portfolioCode,
  portfolioKind,
}: AnalysisViewProps) {
  const schemeConfigs = useMemo(
    () => listAnalysisSchemesForPortfolio(portfolioKind),
    [portfolioKind],
  );
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");
  const activeSchemeCode = useMemo(() => {
    let result = schemeConfigs[0]?.schemeCode ?? "";

    const selected = schemeConfigs.find(
      (config) => config.schemeCode === selectedSchemeCode,
    );
    if (selected) {
      result = selected.schemeCode;
    }

    return result;
  }, [schemeConfigs, selectedSchemeCode]);
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let result: void = undefined;

      setLoading(true);
      setError(null);
      const url = getSnapshotFetchUrl(portfolioCode);
      try {
        const response = await fetch(url);
        if (cancelled) {
          return result;
        }
        if (response.status === 404) {
          setSnapshot(null);
          setError("明細がまだ登録されていません。");
          return result;
        }
        if (!response.ok) {
          setError("データの取得に失敗しました。");
          return result;
        }
        const data = (await response.json()) as CurrentSnapshotDto;
        setSnapshot(data);
      } catch {
        if (!cancelled) {
          setError(getSnapshotLoadErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      return result;
    }

    void load();

    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode]);

  let result: ReactNode = null;

  if (loading) {
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
          <p className="holdings-meta">基準日: {snapshot.asOfDate}</p>
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
        <AllocationPanel slices={allocation.slices} />
      </section>
    </main>
  );
  return result;
}
