"use client";

import Link from "next/link";
import type { CurrentSnapshotDto } from "@repo/shared";
import { sumSnapshotMarketValue } from "@repo/shared";
import { useEffect, useState, type ReactNode } from "react";

import { formatYen } from "@/lib/format-yen";
import {
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";

type PortfolioOverviewViewProps = {
  portfolioCode: string;
};

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

  const totalValue = sumSnapshotMarketValue(snapshot.lines);

  result = (
    <main className="portfolio-overview">
      <h1>
        {snapshot.portfolioName}（{snapshot.portfolioCode}）
      </h1>
      <p className="holdings-meta">基準日: {snapshot.asOfDate}</p>
      <dl className="overview-stats">
        <div>
          <dt>評価額合計</dt>
          <dd>{formatYen(totalValue)}</dd>
        </div>
        <div>
          <dt>保有銘柄数</dt>
          <dd>{snapshot.lines.length}</dd>
        </div>
      </dl>
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
