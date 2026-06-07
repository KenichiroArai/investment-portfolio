"use client";

import Link from "next/link";
import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
  sumSnapshotMarketValue,
  type CurrentSnapshotDto,
} from "@repo/shared";
import { useEffect, useState, type ReactNode } from "react";

import { formatPercent, formatYen } from "@/lib/format-yen";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  type PortfolioListItem,
} from "@/lib/data-source";

type PortfolioCard = {
  code: string;
  name: string;
  asOfDate: string | null;
  marketValueMinor: number | null;
  portfolioGainMinor: number | null;
  gainRateOnAssetBalance: number | null;
  hasSnapshot: boolean;
};

export function HomeView() {
  const [cards, setCards] = useState<PortfolioCard[]>([]);
  const [totalMarketValueMinor, setTotalMarketValueMinor] = useState(0);
  const [totalPortfolioGainMinor, setTotalPortfolioGainMinor] = useState(0);
  const [hasAnySnapshot, setHasAnySnapshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        const portfolios =
          (await portfolioResponse.json()) as PortfolioListItem[];
        const nextCards: PortfolioCard[] = [];
        let total = 0;
        let totalGain = 0;
        let snapshotCount = 0;

        for (const portfolio of portfolios) {
          const snapshotResponse = await fetch(
            getSnapshotFetchUrl(portfolio.code),
          );
          if (cancelled) {
            return result;
          }

          if (snapshotResponse.status === 404) {
            nextCards.push({
              code: portfolio.code,
              name: portfolio.name,
              asOfDate: null,
              marketValueMinor: null,
              portfolioGainMinor: null,
              gainRateOnAssetBalance: null,
              hasSnapshot: false,
            });
            continue;
          }

          if (!snapshotResponse.ok) {
            setError("スナップショットの取得に失敗しました。");
            return result;
          }

          const snapshot =
            (await snapshotResponse.json()) as CurrentSnapshotDto;
          const marketValueMinor = sumSnapshotMarketValue(snapshot.lines);
          const totalContributions = resolveSnapshotTotalContributions(snapshot);
          const portfolioGainMinor = computeSnapshotPortfolioGainMinor(
            marketValueMinor,
            totalContributions,
          );
          const gainRateOnAssetBalance = computeSnapshotGainRate(
            portfolioGainMinor,
            marketValueMinor,
          );
          total += marketValueMinor;
          totalGain += portfolioGainMinor;
          snapshotCount += 1;
          nextCards.push({
            code: portfolio.code,
            name: portfolio.name,
            asOfDate: snapshot.asOfDate,
            marketValueMinor,
            portfolioGainMinor,
            gainRateOnAssetBalance,
            hasSnapshot: true,
          });
        }

        setCards(nextCards);
        setTotalMarketValueMinor(total);
        setTotalPortfolioGainMinor(totalGain);
        setHasAnySnapshot(snapshotCount > 0);
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
    result = <p>読み込み中…</p>;
    return result;
  }

  if (error) {
    result = <p className="holdings-error">{error}</p>;
    return result;
  }

  const totalGainRateOnAssetBalance = computeSnapshotGainRate(
    totalPortfolioGainMinor,
    totalMarketValueMinor,
  );
  const totalGainRateOnAssetBalanceLabel =
    totalGainRateOnAssetBalance === null
      ? "—"
      : formatPercent(totalGainRateOnAssetBalance);

  result = (
    <>
      <section className="home-summary">
        <h2>総資産</h2>
        <p className="home-summary__value">{formatYen(totalMarketValueMinor)}</p>
        {hasAnySnapshot ? (
          <dl className="home-summary__metrics">
            <div>
              <dt>損益</dt>
              <dd>{formatYen(totalPortfolioGainMinor)}</dd>
            </div>
            <div>
              <dt>利益率</dt>
              <dd>{totalGainRateOnAssetBalanceLabel}</dd>
            </div>
          </dl>
        ) : null}
        <p>
          <Link href="/analysis/">全体分析を見る</Link>
        </p>
      </section>

      <section className="home-portfolios">
        <h2>口座</h2>
        {cards.length === 0 ? (
          <p className="note">登録済みの口座がありません。</p>
        ) : (
          <ul className="portfolio-card-list">
            {cards.map((card) => {
              const gainRateOnAssetBalanceLabel =
                card.gainRateOnAssetBalance === null
                  ? "—"
                  : formatPercent(card.gainRateOnAssetBalance);
              let item = (
                <li key={card.code} className="portfolio-card">
                  <h3>
                    <Link href={`/portfolios/${card.code}/`}>{card.name}</Link>
                  </h3>
                  <p className="portfolio-card__code">{card.code}</p>
                  {card.hasSnapshot ? (
                    <>
                      <p>基準日: {card.asOfDate}</p>
                      <p>評価額: {formatYen(card.marketValueMinor ?? 0)}</p>
                      <p>損益: {formatYen(card.portfolioGainMinor ?? 0)}</p>
                      <p>利益率: {gainRateOnAssetBalanceLabel}</p>
                    </>
                  ) : (
                    <p className="note">明細未登録</p>
                  )}
                  <nav className="portfolio-card__links">
                    <Link href={`/portfolios/${card.code}/holdings/`}>明細</Link>
                    <Link href={`/portfolios/${card.code}/analysis/`}>分析</Link>
                  </nav>
                </li>
              );
              return item;
            })}
          </ul>
        )}
      </section>
    </>
  );
  return result;
}
