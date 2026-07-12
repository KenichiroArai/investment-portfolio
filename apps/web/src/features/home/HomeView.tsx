"use client";

import Link from "next/link";
import {
  buildGlobalPortfolioSlices,
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  aggregateTrendPointsByCalendarMonth,
  resolvePeriodBoundsForPreset,
  resolveSnapshotTotalContributions,
  sumSnapshotMarketValue,
  toPortfolioAllocationSlices,
  type AggregatedTrendPoint,
  type CurrentSnapshotDto,
  type SnapshotTrendPointDto,
  type SnapshotTrendsDto,
} from "@repo/shared";
import { ArrowRight, BarChart3, List } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { WritableOnly } from "@/components/WritableOnly";
import { StatCard } from "@/components/stat-card";
import { GlobalAllocationDonutCard } from "@/features/analysis/GlobalAllocationDonutCard";
import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { AccountManagePanel } from "@/features/manage/AccountManagePanel";
import { BackupPanel } from "@/features/backup/BackupPanel";
import {
  buildTrendChartBuckets,
} from "@/features/trends/trend-chart-buckets";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { TrendComboChart } from "@/features/trends/TrendComboChart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatAsOfDateJa,
  formatPercent,
  formatYen,
} from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  getSnapshotTrendsFetchUrl,
  type PortfolioListItem,
} from "@/lib/data-source";
import { cn } from "@/lib/utils";

/** ホーム右カラム内におさまるプロット幅の目安 */
const HOME_TREND_TARGET_PLOT_WIDTH = 360;
/** ホームに表示する月次ポイント数（直近1年） */
const HOME_TREND_MONTH_LIMIT = 12;
const HOME_TREND_CAPTION = "直近1年・期末・万円 / 月 / %";

type PortfolioTrendSeries = {
  code: string;
  name: string;
  points: SnapshotTrendPointDto[];
};

type PortfolioCard = {
  code: string;
  name: string;
  asOfDate: string | null;
  marketValueMinor: number | null;
  portfolioGainMinor: number | null;
  gainRateOnAssetBalance: number | null;
  hasSnapshot: boolean;
};

function resolveTrendPointGainRateOnAssetBalance(point: {
  totalMarketValueMinor: number;
  totalBookValueMinor: number;
  totalContributionsMinor: number | null;
}): number | null {
  let result: number | null = null;
  const costBasis =
    point.totalContributionsMinor ?? point.totalBookValueMinor;
  result = computeSnapshotGainRate(
    computeSnapshotPortfolioGainMinor(point.totalMarketValueMinor, costBasis),
    point.totalMarketValueMinor,
  );
  return result;
}

function formatHomeTrendMonthNumber(bucketKey: string): string {
  let result = bucketKey;
  const match = /^(\d{4})-(\d{2})$/.exec(bucketKey);
  if (!match) {
    return result;
  }
  result = String(Number(match[2]));
  return result;
}

function alignPortfolioMonthValues(
  monthKeys: string[],
  monthlyPoints: AggregatedTrendPoint[],
  mapper: (point: AggregatedTrendPoint) => number | null,
): Array<number | null> {
  let result: Array<number | null> = [];
  const byKey = new Map(
    monthlyPoints.map((point) => [point.bucketKey, point] as const),
  );
  result = monthKeys.map((monthKey) => {
    const point = byKey.get(monthKey);
    if (!point) {
      return null;
    }
    return mapper(point);
  });
  return result;
}

export function HomeView() {
  const [cards, setCards] = useState<PortfolioCard[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [snapshots, setSnapshots] = useState<CurrentSnapshotDto[]>([]);
  const [portfolioTrends, setPortfolioTrends] = useState<PortfolioTrendSeries[]>(
    [],
  );
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
        const nextSnapshots: CurrentSnapshotDto[] = [];
        const nextPortfolioTrends: PortfolioTrendSeries[] = [];
        let total = 0;
        let totalGain = 0;
        let snapshotCount = 0;

        for (const portfolio of portfolioRows) {
          const [snapshotResponse, trendsResponse] = await Promise.all([
            fetch(getSnapshotFetchUrl(portfolio.code)),
            fetch(getSnapshotTrendsFetchUrl(portfolio.code)),
          ]);
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
          nextSnapshots.push(snapshot);
          nextCards.push({
            code: portfolio.code,
            name: portfolio.name,
            asOfDate: snapshot.asOfDate,
            marketValueMinor,
            portfolioGainMinor,
            gainRateOnAssetBalance,
            hasSnapshot: true,
          });

          if (trendsResponse.ok) {
            const trends = (await trendsResponse.json()) as SnapshotTrendsDto;
            if (trends.points.length > 0) {
              nextPortfolioTrends.push({
                code: portfolio.code,
                name: portfolio.name,
                points: trends.points,
              });
            }
          }
        }

        setCards(nextCards);
        setSnapshots(nextSnapshots);
        setPortfolioTrends(nextPortfolioTrends);
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

  const portfolioSlices = useMemo(() => {
    let result = toPortfolioAllocationSlices(
      buildGlobalPortfolioSlices(snapshots).portfolios,
    );
    return result;
  }, [snapshots]);

  const marketValueTrendChart = useMemo(() => {
    let result: {
      labels: string[];
      sourceDates: string[];
      sourceDateLabels: string[];
      barSeries: TrendChartSeries[];
      lineSeries: TrendChartSeries[];
    } | null = null;

    if (portfolioTrends.length === 0) {
      return result;
    }

    const availableDates = portfolioTrends.flatMap((series) =>
      series.points.map((point) => point.asOfDate),
    );
    const bounds = resolvePeriodBoundsForPreset("12m", availableDates);
    if (!bounds) {
      return result;
    }

    const monthKeySet = new Set<string>();
    const monthlyByPortfolio = portfolioTrends.map((series) => {
      const monthlyPoints = aggregateTrendPointsByCalendarMonth(
        series.points,
        bounds.from,
        bounds.to,
        { pick: "last" },
      );
      for (const point of monthlyPoints) {
        monthKeySet.add(point.bucketKey);
      }
      return {
        ...series,
        monthlyPoints,
      };
    });

    const monthKeys = [...monthKeySet]
      .sort((left, right) => left.localeCompare(right))
      .slice(-HOME_TREND_MONTH_LIMIT);
    if (monthKeys.length === 0) {
      return result;
    }

    const axisPoints: AggregatedTrendPoint[] = monthKeys.map((monthKey) => {
      let axisPoint: AggregatedTrendPoint = {
        asOfDate: `${monthKey}-01`,
        totalMarketValueMinor: 0,
        totalBookValueMinor: 0,
        unrealizedGainMinor: 0,
        gainRateOnBook: null,
        totalContributionsMinor: null,
        gainRateOnContributions: null,
        allocationsByScheme: {},
        bucketKey: monthKey,
        bucketLabel: formatHomeTrendMonthNumber(monthKey),
        sourceAsOfDate: `${monthKey}-01`,
      };

      for (const series of monthlyByPortfolio) {
        const point = series.monthlyPoints.find(
          (item) => item.bucketKey === monthKey,
        );
        if (!point) {
          continue;
        }
        if (point.sourceAsOfDate > axisPoint.sourceAsOfDate) {
          axisPoint = {
            ...axisPoint,
            asOfDate: point.asOfDate,
            sourceAsOfDate: point.sourceAsOfDate,
          };
        }
      }

      return axisPoint;
    });

    const chartBuckets = buildTrendChartBuckets({
      displayPoints: axisPoints,
      baselinePoint: null,
      trendDisplayUnit: "1m",
    });

    const barSeries: TrendChartSeries[] = [];
    const lineSeries: TrendChartSeries[] = [];

    monthlyByPortfolio.forEach((series, index) => {
      const color = getAllocationChartColor(index);
      const marketValues = alignPortfolioMonthValues(
        monthKeys,
        series.monthlyPoints,
        (point) => point.totalMarketValueMinor,
      );
      const gainRates = alignPortfolioMonthValues(
        monthKeys,
        series.monthlyPoints,
        (point) => resolveTrendPointGainRateOnAssetBalance(point),
      );

      if (marketValues.some((value) => value !== null && Number.isFinite(value))) {
        barSeries.push({
          key: `market-${series.code}`,
          label: series.name,
          color,
          values: marketValues,
          formatValue: (value) => formatYen(value),
        });
      }

      if (gainRates.some((value) => value !== null && Number.isFinite(value))) {
        lineSeries.push({
          key: `gain-${series.code}`,
          label: series.name,
          color,
          values: gainRates,
          formatValue: (value) => formatPercent(value),
        });
      }
    });

    if (barSeries.length === 0 && lineSeries.length === 0) {
      return result;
    }

    result = {
      labels: chartBuckets.chartPoints.map((point) => point.bucketLabel),
      sourceDates: chartBuckets.sourceDates,
      sourceDateLabels: chartBuckets.sourceDateLabels,
      barSeries,
      lineSeries,
    };
    return result;
  }, [portfolioTrends]);

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

        {hasAnySnapshot ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <GlobalAllocationDonutCard
                  title="口座別構成"
                  slices={portfolioSlices}
                />
              </CardContent>
            </Card>
            {marketValueTrendChart !== null ? (
              <Card>
                <CardContent className="pt-6">
                  <TrendComboChart
                    title="評価額・利益率の変化"
                    caption={HOME_TREND_CAPTION}
                    labels={marketValueTrendChart.labels}
                    sourceDates={marketValueTrendChart.sourceDates}
                    sourceDateLabels={marketValueTrendChart.sourceDateLabels}
                    targetPlotWidth={HOME_TREND_TARGET_PLOT_WIDTH}
                    reservedSlotCount={HOME_TREND_MONTH_LIMIT}
                    height={240}
                    barSeries={marketValueTrendChart.barSeries}
                    lineSeries={marketValueTrendChart.lineSeries}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <Button variant="outline" asChild>
          <Link href="/analysis/">
            <BarChart3 className="h-4 w-4" />
            全口座を見る
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
                          <dd className="font-medium">
                            {card.asOfDate !== null
                              ? formatAsOfDateJa(card.asOfDate)
                              : "—"}
                          </dd>
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
                        <Link
                          href={`${buildPortfolioPath(card.code, "portfolio-allocation")}`}
                        >
                          <List className="h-3.5 w-3.5" />
                          ポートフォリオ配分
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={buildPortfolioPath(card.code, "analysis")}>
                          <BarChart3 className="h-3.5 w-3.5" />
                          資産配分
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
              return item;
            })}
          </div>
        )}
      </section>

      <WritableOnly>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">データのバックアップ</h2>
          <BackupPanel
            scope="all"
            onImported={() => {
              setReloadKey((value) => value + 1);
            }}
          />
        </section>
      </WritableOnly>
    </div>
  );
  return result;
}
