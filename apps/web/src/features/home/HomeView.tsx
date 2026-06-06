"use client";

import Link from "next/link";
import { sumSnapshotMarketValue, type CurrentSnapshotDto } from "@repo/shared";
import { useEffect, useState, type ReactNode } from "react";

import { formatYen } from "@/lib/format-yen";
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
  hasSnapshot: boolean;
};

export function HomeView() {
  const [cards, setCards] = useState<PortfolioCard[]>([]);
  const [totalMarketValueMinor, setTotalMarketValueMinor] = useState(0);
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
          total += marketValueMinor;
          nextCards.push({
            code: portfolio.code,
            name: portfolio.name,
            asOfDate: snapshot.asOfDate,
            marketValueMinor,
            hasSnapshot: true,
          });
        }

        setCards(nextCards);
        setTotalMarketValueMinor(total);
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

  result = (
    <>
      <section className="home-summary">
        <h2>総資産</h2>
        <p className="home-summary__value">{formatYen(totalMarketValueMinor)}</p>
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
