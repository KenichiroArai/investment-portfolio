"use client";

import {
  buildGlobalInstrumentPortfolioStack,
  buildGlobalInstrumentRankingValues,
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
} from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { GlobalAllocationDonutCard } from "@/features/analysis/GlobalAllocationDonutCard";
import { GlobalInstrumentTable } from "@/features/analysis/GlobalInstrumentTable";
import { getAllocationChartColor } from "@/features/analysis/chart-colors";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { TrendBarChart } from "@/features/trends/TrendBarChart";
import type { TrendChartSeries } from "@/features/trends/trend-chart-series";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent, formatYen } from "@/lib/format-yen";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  type PortfolioListItem,
} from "@/lib/data-source";

const CHART_INSTRUMENT_LIMIT = 12;

export function GlobalAnalysisView() {
  const [snapshots, setSnapshots] = useState<CurrentSnapshotDto[]>([]);
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
        for (const portfolio of portfolioRows) {
          const snapshotResponse = await fetch(
            getSnapshotFetchUrl(portfolio.code),
          );
          if (cancelled) {
            return result;
          }
          if (!snapshotResponse.ok) {
            continue;
          }
          loadedSnapshots.push(
            (await snapshotResponse.json()) as CurrentSnapshotDto,
          );
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

  const rankingLabels = useMemo(() => {
    let result = instrumentChartRows.map((row) => row.instrumentName);
    return result;
  }, [instrumentChartRows]);

  const rankingSeries = useMemo(() => {
    let result: TrendChartSeries[] = [
      {
        key: "marketValue",
        label: "評価額",
        color: getAllocationChartColor(0),
        values: buildGlobalInstrumentRankingValues(instrumentChartRows),
        formatValue: (value) => formatYen(value),
      },
    ];
    return result;
  }, [instrumentChartRows]);

  const stackChart = useMemo(() => {
    let result = buildGlobalInstrumentPortfolioStack(
      instrumentRows,
      portfolioSummary.portfolios,
      CHART_INSTRUMENT_LIMIT,
    );
    return result;
  }, [instrumentRows, portfolioSummary.portfolios]);

  const stackSeries = useMemo(() => {
    let result: TrendChartSeries[] = stackChart.series.map((item, index) => {
      let series: TrendChartSeries = {
        key: item.key,
        label: item.label,
        color: getAllocationChartColor(index),
        values: item.values,
        formatValue: (value) => formatYen(value),
      };
      return series;
    });
    return result;
  }, [stackChart.series]);

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
        <Card>
          <CardContent className="pt-6">
            <GlobalAllocationDonutCard
              title="口座別構成"
              slices={portfolioSlices}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <GlobalAllocationDonutCard
              title="銘柄別構成"
              slices={instrumentSlices}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <TrendBarChart
            title="銘柄ランキング"
            caption={`評価額上位 ${CHART_INSTRUMENT_LIMIT} 銘柄（超過分はその他）`}
            labels={rankingLabels}
            series={rankingSeries}
            valueKind="yen"
            height={280}
          />
        </CardContent>
      </Card>

      {stackSeries.length > 0 && stackChart.labels.length > 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <TrendBarChart
              title="口座×銘柄"
              caption="上位銘柄ごとの口座別評価額"
              labels={stackChart.labels}
              series={stackSeries}
              mode="stacked"
              valueKind="yen"
              height={300}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">銘柄一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          <GlobalInstrumentTable rows={instrumentRows} />
        </CardContent>
      </Card>
    </PageContainer>
  );
  return result;
}
