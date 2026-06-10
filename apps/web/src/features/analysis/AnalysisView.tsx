"use client";

import Link from "next/link";
import {
  buildAllocationBySchemeWithLines,
  resolveAnalysisSchemes,
  sumSnapshotMarketValue,
  type AnalysisSchemeConfig,
} from "@repo/shared";
import { Settings } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { AnalysisPanelSummary } from "@/features/analysis/AnalysisPanelSummary";
import { usePortfolioTime } from "@/features/portfolio/PortfolioTimeContext";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAsOfDateJa, formatYen } from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type AnalysisViewProps = {
  portfolioCode: string;
  portfolioKind: string;
};

export function AnalysisView({
  portfolioCode,
  portfolioKind,
}: AnalysisViewProps) {
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");
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
        <LoadingSkeleton />
      </PageContainer>
    );
    return result;
  }

  if (error) {
    result = (
      <PageContainer>
        <PageHeader title="資産配分" />
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
        <PageHeader title="資産配分" />
        <Alert variant="destructive">
          <AlertDescription>資産配分の対象となる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const schemeConfigs = resolveAnalysisSchemes(snapshot, portfolioKind);
  const activeSchemeCode = (() => {
    let activeResult = schemeConfigs[0]?.schemeCode ?? "";

    const selected = schemeConfigs.find(
      (config) => config.schemeCode === selectedSchemeCode,
    );
    if (selected) {
      activeResult = selected.schemeCode;
    }

    return activeResult;
  })();

  if (schemeConfigs.length === 0) {
    result = (
      <PageContainer>
        <PageHeader title="資産配分" />
        <p className="text-sm text-muted-foreground">
          この口座種別の資産配分軸はまだ定義されていません。
        </p>
      </PageContainer>
    );
    return result;
  }

  const activeScheme = schemeConfigs.find(
    (config) => config.schemeCode === activeSchemeCode,
  ) as AnalysisSchemeConfig;
  const allocation = buildAllocationBySchemeWithLines(
    snapshot.lines,
    activeScheme.schemeCode,
    activeScheme.schemeName,
  );
  const totalValue = sumSnapshotMarketValue(snapshot.lines);

  result = (
    <PageContainer>
      <PageHeader
        title="資産配分"
        description={`${snapshot.portfolioName}（${snapshot.portfolioCode}）`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {formatAsOfDateJa(selectedAsOfDate ?? snapshot.asOfDate)}
            </Badge>
            {isHistoricalView ? <Badge variant="secondary">履歴</Badge> : null}
            <Button variant="outline" size="sm" asChild>
              <Link href={buildPortfolioPath(portfolioCode, "settings", "classification")}>
                <Settings className="h-4 w-4" />
                分類設定
              </Link>
            </Button>
          </div>
        }
      />
      <p className="-mt-4 mb-4 text-sm font-medium">
        評価額合計: {formatYen(totalValue)}
      </p>

      <Tabs
        value={activeSchemeCode}
        onValueChange={setSelectedSchemeCode}
        className="space-y-4"
      >
        <TabsList className="flex h-auto flex-wrap">
          {schemeConfigs.map((config) => {
            let tab = (
              <TabsTrigger key={config.schemeCode} value={config.schemeCode}>
                {config.schemeName}
              </TabsTrigger>
            );
            return tab;
          })}
        </TabsList>
        {schemeConfigs.map((config) => {
          const schemeAllocation =
            config.schemeCode === activeSchemeCode
              ? allocation
              : buildAllocationBySchemeWithLines(
                  snapshot.lines,
                  config.schemeCode,
                  config.schemeName,
                );

          let content = (
            <TabsContent key={config.schemeCode} value={config.schemeCode}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{config.schemeName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AnalysisPanelSummary
                    axisTotalMinor={schemeAllocation.totalMarketValueMinor}
                    assetTotalMinor={totalValue}
                  />
                  <AllocationPanel slices={schemeAllocation.slices} />
                </CardContent>
              </Card>
            </TabsContent>
          );
          return content;
        })}
      </Tabs>
    </PageContainer>
  );
  return result;
}
