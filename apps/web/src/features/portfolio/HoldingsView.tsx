"use client";

import { collectHoldingsClassificationSchemes } from "@repo/shared";
import type { ReactNode } from "react";

import { HoldingsDetailTable } from "@/features/holdings/HoldingsDetailTable";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatAsOfDateJa } from "@/lib/format-yen";

type HoldingsViewProps = {
  portfolioCode: string;
};

export function HoldingsView({ portfolioCode }: HoldingsViewProps) {
  const {
    snapshot,
    loadingSnapshot,
    loadingDates,
    error,
    selectedAsOfDate,
    isHistoricalView,
  } = usePortfolioTime();

  let result: ReactNode = null;

  if (loadingDates || loadingSnapshot) {
    result = (
      <PageContainer>
        <LoadingSkeleton variant="table" />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title="保有明細" description={portfolioCode} />
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
        <PageHeader title="保有明細" description={portfolioCode} />
        <Alert variant="destructive">
          <AlertDescription>明細がまだ登録されていません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  result = (
    <PageContainer>
      <PageHeader
        title="保有明細"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              基準日: {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
            </Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴表示中</Badge> : null}
          </div>
        }
      />
      <Card>
        <CardContent className="p-0 pt-4">
          {snapshot.lines.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              保有銘柄がありません。
            </p>
          ) : (
            <HoldingsDetailTable
              lines={snapshot.lines}
              classificationSchemes={collectHoldingsClassificationSchemes(
                snapshot.analysisSchemes,
                snapshot.lines,
              )}
            />
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
  return result;
}
