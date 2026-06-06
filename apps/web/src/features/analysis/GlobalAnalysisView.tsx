"use client";

import Link from "next/link";
import {
  buildAllocationBySchemeWithLinesFromSnapshots,
  listAnalysisSchemesForPortfolio,
  mergeSnapshotsForGlobalAnalysis,
  type CurrentSnapshotDto,
} from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { formatPercent, formatYen } from "@/lib/format-yen";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  type PortfolioListItem,
} from "@/lib/data-source";

export function GlobalAnalysisView() {
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [snapshots, setSnapshots] = useState<CurrentSnapshotDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");
  const schemeConfigs = useMemo(() => {
    let result = listAnalysisSchemesForPortfolio("ideco");

    if (portfolios.length > 0) {
      const kinds = new Set(portfolios.map((portfolio) => portfolio.kind));
      if (!kinds.has("ideco") && kinds.size > 0) {
        result = [];
      }
    }

    return result;
  }, [portfolios]);
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

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let result: void = undefined;

      setLoading(true);
      setError(null);

      try {
        const portfolioResponse = await fetch(getPortfoliosFetchUrl());
        if (cancelled) {
          return result;
        }
        if (!portfolioResponse.ok) {
          setError("口座一覧の取得に失敗しました。");
          return result;
        }

        const portfolioRows =
          (await portfolioResponse.json()) as PortfolioListItem[];
        setPortfolios(portfolioRows);

        const loadedSnapshots: CurrentSnapshotDto[] = [];
        for (const portfolio of portfolioRows) {
          const snapshotResponse = await fetch(
            getSnapshotFetchUrl(portfolio.code),
          );
          if (cancelled) {
            return result;
          }
          if (snapshotResponse.status === 404) {
            continue;
          }
          if (!snapshotResponse.ok) {
            setError("スナップショットの取得に失敗しました。");
            return result;
          }
          const snapshot =
            (await snapshotResponse.json()) as CurrentSnapshotDto;
          loadedSnapshots.push(snapshot);
        }

        setSnapshots(loadedSnapshots);
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
  }, []);

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
        <h1>全体分析</h1>
        <p className="holdings-error">{error}</p>
      </main>
    );
    return result;
  }

  if (snapshots.length === 0) {
    result = (
      <main>
        <h1>全体分析</h1>
        <p className="holdings-error">分析対象の明細がありません。</p>
      </main>
    );
    return result;
  }

  const merged = mergeSnapshotsForGlobalAnalysis(snapshots, schemeConfigs);
  const activeScheme = schemeConfigs.find(
    (config) => config.schemeCode === activeSchemeCode,
  );
  const allocation =
    activeScheme !== undefined
      ? buildAllocationBySchemeWithLinesFromSnapshots(
          snapshots,
          activeScheme.schemeCode,
          activeScheme.schemeName,
        )
      : null;

  result = (
    <main className="analysis-page global-analysis">
      <h1>全体分析</h1>
      <p className="analysis-page__total">
        総評価額: {formatYen(merged.totalMarketValueMinor)}
      </p>

      <section className="global-analysis__portfolios">
        <h2>口座別内訳</h2>
        <table className="allocation-table">
          <thead>
            <tr>
              <th>口座</th>
              <th>基準日</th>
              <th>評価額</th>
              <th>構成比</th>
            </tr>
          </thead>
          <tbody>
            {merged.portfolios.map((portfolio) => {
              let row = (
                <tr key={portfolio.portfolioCode}>
                  <td>
                    <Link href={`/portfolios/${portfolio.portfolioCode}/analysis/`}>
                      {portfolio.portfolioName}
                    </Link>
                  </td>
                  <td>{portfolio.asOfDate}</td>
                  <td>{formatYen(portfolio.marketValueMinor)}</td>
                  <td>{formatPercent(portfolio.weight)}</td>
                </tr>
              );
              return row;
            })}
          </tbody>
        </table>
      </section>

      {schemeConfigs.length > 0 && allocation ? (
        <>
          <div className="analysis-axis-tabs" role="tablist" aria-label="分析軸">
            {schemeConfigs.map((config) => {
              let tab = (
                <button
                  key={config.schemeCode}
                  type="button"
                  role="tab"
                  aria-selected={config.schemeCode === activeSchemeCode}
                  className={
                    config.schemeCode === activeSchemeCode
                      ? "is-active"
                      : undefined
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
            <h2>全口座合算 — {activeScheme?.schemeName}</h2>
            <AllocationPanel
              slices={allocation.slices}
              showPortfolioColumn
            />
          </section>
        </>
      ) : (
        <p className="note">横断分析に利用できる分類軸がありません。</p>
      )}
    </main>
  );
  return result;
}
