"use client";

import Link from "next/link";
import {
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
  sumSnapshotMarketValue,
  type CurrentSnapshotDto,
} from "@repo/shared";
import { ArrowRight, BarChart3, List } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { WritableOnly } from "@/components/WritableOnly";
import { StatCard } from "@/components/stat-card";
import { AccountManagePanel } from "@/features/manage/AccountManagePanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPercent, formatYen } from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  type PortfolioListItem,
} from "@/lib/data-source";
import { cn } from "@/lib/utils";

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
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
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

        const portfolioRows =
          (await portfolioResponse.json()) as PortfolioListItem[];
        setPortfolios(portfolioRows);
        const nextCards: PortfolioCard[] = [];
        let total = 0;
        let totalGain = 0;
        let snapshotCount = 0;

        for (const portfolio of portfolioRows) {
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
  }, [reloadKey]);

  let result: ReactNode = null;

  if (loading) {
    result = <LoadingSkeleton variant="cards" />;
    return result;
  }

  if (error) {
    result = (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
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
  const gainClassName =
    totalPortfolioGainMinor >= 0 ? "text-positive" : "text-negative";

  result = (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="総資産"
            value={formatYen(totalMarketValueMinor)}
            className="sm:col-span-2 lg:col-span-1"
            valueClassName="text-3xl"
          />
          {hasAnySnapshot ? (
            <>
              <StatCard
                label="損益"
                value={formatYen(totalPortfolioGainMinor)}
                valueClassName={gainClassName}
              />
              <StatCard
                label="利益率"
                value={totalGainRateOnAssetBalanceLabel}
                valueClassName={gainClassName}
              />
            </>
          ) : null}
        </div>
        <Button variant="outline" asChild>
          <Link href="/analysis/">
            <BarChart3 className="h-4 w-4" />
            全口座の資産配分を見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">口座</h2>
          <WritableOnly>
            <AccountManagePanel
              portfolios={portfolios}
              onChanged={() => {
                setReloadKey((value) => value + 1);
              }}
            />
          </WritableOnly>
        </div>
        {cards.length === 0 ? (
          <EmptyState title="登録済みの口座がありません" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card) => {
              const gainRateOnAssetBalanceLabel =
                card.gainRateOnAssetBalance === null
                  ? "—"
                  : formatPercent(card.gainRateOnAssetBalance);
              const cardGainClass =
                (card.portfolioGainMinor ?? 0) >= 0
                  ? "text-positive"
                  : "text-negative";

              let item = (
                <Card
                  key={card.code}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      <Link
                        href={buildPortfolioPath(card.code)}
                        className="hover:underline"
                      >
                        {card.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>{card.code}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {card.hasSnapshot ? (
                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">基準日</dt>
                          <dd className="font-medium">{card.asOfDate}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">評価額</dt>
                          <dd className="font-medium">
                            {formatYen(card.marketValueMinor ?? 0)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">損益</dt>
                          <dd className={cn("font-medium", cardGainClass)}>
                            {formatYen(card.portfolioGainMinor ?? 0)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">利益率</dt>
                          <dd className={cn("font-medium", cardGainClass)}>
                            {gainRateOnAssetBalanceLabel}
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">明細未登録</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={buildPortfolioPath(card.code, "holdings")}>
                          <List className="h-3.5 w-3.5" />
                          明細
                        </Link>
                      </Button>
                      <WritableOnly>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={buildPortfolioPath(card.code, "analysis")}>
                            <BarChart3 className="h-3.5 w-3.5" />
                            資産配分
                          </Link>
                        </Button>
                      </WritableOnly>
                    </div>
                  </CardContent>
                </Card>
              );
              return item;
            })}
          </div>
        )}
      </section>
    </div>
  );
  return result;
}
