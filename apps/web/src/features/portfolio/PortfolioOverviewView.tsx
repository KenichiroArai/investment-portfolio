"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioOverviewSummary } from "@/features/portfolio/PortfolioOverviewSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sumSnapshotMarketValue } from "@repo/shared";
import { BarChart3, PieChart } from "lucide-react";
import {
  formatAsOfDateJa,
  formatYen,
} from "@/lib/format-yen";
import { resolvePortfolioKind } from "@/lib/resolve-portfolio-kind";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type PortfolioOverviewViewProps = {
  portfolioCode: string;
};

export function PortfolioOverviewView({
  portfolioCode,
}: PortfolioOverviewViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
    currentAsOfDate,
    trends,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot) {
    result = (
      <PageContainer>
        <LoadingSkeleton variant="cards" />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title={portfolioCode} />
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  if (!snapshot) {
    result = (
      <PageContainer>
        <PageHeader title={portfolioCode} />
        <Alert variant="destructive">
          <AlertDescription>明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const assetBalance = sumSnapshotMarketValue(snapshot.lines);
  const latestPoint =
    trends?.points.find((point) => point.asOfDate === currentAsOfDate) ??
    trends?.points[trends.points.length - 1];
  const deltaHint =
    isHistoricalView && latestPoint
      ? `最新比 評価額 ${formatYen(latestPoint.totalMarketValueMinor - assetBalance)}`
      : null;

  const portfolioKind = resolvePortfolioKind(portfolioCode, snapshot);

  result = (
    <PageContainer>
      <PageHeader
        title="資産状況"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
              {isHistoricalView ? " · 履歴" : " · 現在"}
            </Badge>
          </div>
        }
      />
      <PortfolioOverviewSummary
        snapshot={snapshot}
        portfolioKind={portfolioKind}
        deltaHint={deltaHint}
        className="mb-6"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={buildPortfolioPath(portfolioCode, "portfolio-allocation")}>
            <PieChart className="h-4 w-4" />
            ポートフォリオ配分
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={buildPortfolioPath(portfolioCode, "analysis")}>
            <BarChart3 className="h-4 w-4" />
            資産配分
          </Link>
        </Button>
      </div>
    </PageContainer>
  );
  return result;
}
