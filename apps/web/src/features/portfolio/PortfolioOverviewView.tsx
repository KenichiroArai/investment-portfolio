"use client";

import Link from "next/link";
import type { CurrentSnapshotDto } from "@repo/shared";
import {
  computeSnapshotUnrealizedGainRate,
  sumSnapshotBookValue,
  sumSnapshotMarketValue,
  sumSnapshotUnrealizedGainMinor,
} from "@repo/shared";
import { useEffect, useState, type ReactNode } from "react";

import {
  formatAsOfDateJa,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";
import {
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";

type PortfolioOverviewViewProps = {
  portfolioCode: string;
};

type AssetStatusFieldProps = {
  label: string;
  value: string;
};

function AssetStatusField({ label, value }: AssetStatusFieldProps) {
  let result = (
    <div className="asset-status__field">
      <div className="asset-status__label">{label}</div>
      <div className="asset-status__value">{value}</div>
    </div>
  );
  return result;
}

export function PortfolioOverviewView({
  portfolioCode,
}: PortfolioOverviewViewProps) {
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
        <h1>{portfolioCode}</h1>
        <p className="holdings-error">{error}</p>
      </main>
    );
    return result;
  }

  if (!snapshot) {
    result = (
      <main>
        <h1>{portfolioCode}</h1>
        <p className="holdings-error">明細がありません。</p>
      </main>
    );
    return result;
  }

  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const totalContributions = sumSnapshotBookValue(snapshot.lines);
  const unrealizedGain = sumSnapshotUnrealizedGainMinor(snapshot.lines);
  const gainRate = computeSnapshotUnrealizedGainRate(
    unrealizedGain,
    totalContributions,
  );
  const gainRateLabel =
    gainRate === null ? "—" : formatPercent(gainRate);

  result = (
    <main className="portfolio-overview">
      <h1 className="asset-status__title">資産状況</h1>
      <div className="asset-status__banner">
        現在の資産状況 {formatAsOfDateJa(snapshot.asOfDate)} 現在
      </div>
      <section className="asset-status__panel" aria-label="資産状況サマリー">
        <div className="asset-status__row">
          <AssetStatusField
            label="資産残高"
            value={formatYen(assetBalance)}
          />
          <AssetStatusField
            label="拠出金累計"
            value={formatYen(totalContributions)}
          />
        </div>
        <div className="asset-status__row">
          <AssetStatusField label="損益" value={formatYen(unrealizedGain)} />
          <AssetStatusField label="損益率" value={gainRateLabel} />
        </div>
      </section>
      <nav className="overview-links" aria-label="クイックリンク">
        <ul>
          <li>
            <Link href={`/portfolios/${portfolioCode}/holdings/`}>明細を見る</Link>
          </li>
          <li>
            <Link href={`/portfolios/${portfolioCode}/analysis/`}>分析を見る</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
  return result;
}
