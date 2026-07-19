"use client";

import {
  buildGlobalInstrumentRows,
  buildGlobalPortfolioSlices,
  collapseGlobalInstrumentRows,
  computeSnapshotGainRate,
  computeSnapshotPortfolioGainMinor,
  resolveSnapshotTotalContributions,
  sumSnapshotMarketValue,
  toInstrumentAllocationSlices,
  toPortfolioAllocationSlices,
  type CurrentSnapshotDto,
  type SnapshotTrendsDto,
} from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { GlobalAllocationDonutCard } from "@/features/analysis/GlobalAllocationDonutCard";
import { GlobalInstrumentTable } from "@/features/analysis/GlobalInstrumentTable";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import {
  buildPortfolioMarketValueGainRateComboChart,
  PORTFOLIO_COMBO_TREND_CAPTION,
  PORTFOLIO_COMBO_TREND_MONTH_LIMIT,
  PORTFOLIO_COMBO_TREND_TARGET_PLOT_WIDTH,
  type PortfolioTrendSeriesInput,
} from "@/features/trends/build-portfolio-combo-chart";
import { TrendComboChart } from "@/features/trends/TrendComboChart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, formatYen } from "@/lib/format-yen";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  getSnapshotTrendsFetchUrl,
  type PortfolioListItem,
} from "@/lib/data-source";

const CHART_INSTRUMENT_LIMIT = 12;
const INSTRUMENT_TABLE_MAX_HEIGHT = "24rem";

export function GlobalAnalysisView() {
  const [snapshots, setSnapshots] = useState<CurrentSnapshotDto[]>([]);
  const [portfolioTrends, setPortfolioTrends] = useState<
    PortfolioTrendSeriesInput[]
  >([]);
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

        const loadedSnapshots: CurrentSnapshotDto[] = [];
        const loadedTrends: PortfolioTrendSeriesInput[] = [];

        for (const portfolio of portfolioRows) {
          const [snapshotResponse, trendsResponse] = await Promise.all([
            fetch(getSnapshotFetchUrl(portfolio.code)),
            fetch(getSnapshotTrendsFetchUrl(portfolio.code)),
          ]);
          if (cancelled) {
            return result;
          }
          if (!snapshotResponse.ok) {
            continue;
          }

          const snapshot =
            (await snapshotResponse.json()) as CurrentSnapshotDto;
          loadedSnapshots.push(snapshot);

          if (trendsResponse.ok) {
            const trends = (await trendsResponse.json()) as SnapshotTrendsDto;
            if (trends.points.length > 0) {
              loadedTrends.push({
                code: portfolio.code,
                name: portfolio.name,
                points: trends.points,
              });
            }
          }
        }

        setSnapshots(loadedSnapshots);
        setPortfolioTrends(loadedTrends);
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

  const portfolioSummary = useMemo(() => {
    let result = buildGlobalPortfolioSlices(snapshots);
    return result;
  }, [snapshots]);

  const instrumentRows = useMemo(() => {
    let result = buildGlobalInstrumentRows(snapshots);
    return result;
  }, [snapshots]);

  const portfolioSlices = useMemo(() => {
    let result = toPortfolioAllocationSlices(portfolioSummary.portfolios);
    return result;
  }, [portfolioSummary]);

  const instrumentChartRows = useMemo(() => {
    let result = collapseGlobalInstrumentRows(
      instrumentRows,
      CHART_INSTRUMENT_LIMIT,
    );
    return result;
  }, [instrumentRows]);

  const instrumentSlices = useMemo(() => {
    let result = toInstrumentAllocationSlices(instrumentChartRows);
    return result;
  }, [instrumentChartRows]);

  const marketValueTrendChart = useMemo(() => {
    let result = buildPortfolioMarketValueGainRateComboChart(portfolioTrends, {
      monthLimit: PORTFOLIO_COMBO_TREND_MONTH_LIMIT,
    });
    return result;
  }, [portfolioTrends]);

  const totalPortfolioGainMinor = useMemo(() => {
    let result = 0;

    for (const snapshot of snapshots) {
      const marketValueMinor = sumSnapshotMarketValue(snapshot.lines);
      const totalContributions = resolveSnapshotTotalContributions(snapshot);
      result += computeSnapshotPortfolioGainMinor(
        marketValueMinor,
        totalContributions,
      );
    }

    return result;
  }, [snapshots]);

  const totalGainRate = useMemo(() => {
    let result = computeSnapshotGainRate(
      totalPortfolioGainMinor,
      portfolioSummary.totalMarketValueMinor,
    );
    return result;
  }, [totalPortfolioGainMinor, portfolioSummary.totalMarketValueMinor]);

  let result: ReactNode = null;

  if (loading) {
    result = (
      <PageContainer>
        <LoadingSkeleton />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title="全口座" />
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  if (snapshots.length === 0) {
    result = (
      <PageContainer>
        <PageHeader title="全口座" />
        <Alert variant="destructive">
          <AlertDescription>表示できる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const gainClassName =
    totalPortfolioGainMinor >= 0 ? "text-positive" : "text-negative";
  const gainRateLabel =
    totalGainRate === null ? "—" : formatPercent(totalGainRate);

  result = (
    <PageContainer>
      <PageHeader
        title="全口座"
        description="銘柄名で口座横断に合算した共通表示です。"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="総評価額"
          value={formatYen(portfolioSummary.totalMarketValueMinor)}
          valueClassName="text-2xl"
        />
        <StatCard
          label="損益"
          value={formatYen(totalPortfolioGainMinor)}
          valueClassName={gainClassName}
        />
        <StatCard
          label="利益率"
          value={gainRateLabel}
          valueClassName={gainClassName}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardContent className="min-w-0 pt-6">
            <GlobalAllocationDonutCard
              title="口座別構成"
              slices={portfolioSlices}
            />
          </CardContent>
        </Card>
        {marketValueTrendChart !== null ? (
          <Card className="min-w-0">
            <CardContent className="min-w-0 pt-6">
              <TrendComboChart
                title="評価額・利益率の変化"
                caption={PORTFOLIO_COMBO_TREND_CAPTION}
                labels={marketValueTrendChart.labels}
                sourceDates={marketValueTrendChart.sourceDates}
                sourceDateLabels={marketValueTrendChart.sourceDateLabels}
                targetPlotWidth={PORTFOLIO_COMBO_TREND_TARGET_PLOT_WIDTH}
                reservedSlotCount={PORTFOLIO_COMBO_TREND_MONTH_LIMIT}
                height={240}
                barSeries={marketValueTrendChart.barSeries}
                lineSeries={marketValueTrendChart.lineSeries}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <GlobalAllocationDonutCard
            title="銘柄別構成"
            slices={instrumentSlices}
            showLegendValues
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">銘柄一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          <GlobalInstrumentTable
            rows={instrumentRows}
            maxHeight={INSTRUMENT_TABLE_MAX_HEIGHT}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
  return result;
}
