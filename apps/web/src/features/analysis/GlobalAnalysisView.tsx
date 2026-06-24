"use client";

import Link from "next/link";
import {
  buildAllocationBySchemeWithLinesFromSnapshots,
  mergeAnalysisSchemesFromSnapshots,
  mergeSnapshotsForGlobalAnalysis,
  type CurrentSnapshotDto,
} from "@repo/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { AnalysisPanelSummary } from "@/features/analysis/AnalysisPanelSummary";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatAllocationPercent,
  formatAsOfDateJa,
  formatYen,
} from "@/lib/format-yen";
import { buildPortfolioPath } from "@/lib/portfolio-path";
import {
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
  type PortfolioListItem,
} from "@/lib/data-source";

export function GlobalAnalysisView() {
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const [snapshots, setSnapshots] = useState<CurrentSnapshotDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSchemeCode, setSelectedSchemeCode] = useState("");
  const schemeConfigs = useMemo(() => {
    let result = mergeAnalysisSchemesFromSnapshots(snapshots);

    if (portfolios.length > 0) {
      const kinds = new Set(portfolios.map((portfolio) => portfolio.kind));
      if (!kinds.has("ideco") && kinds.size > 0) {
        result = [];
      }
    }

    return result;
  }, [portfolios, snapshots]);
  const activeSchemeCode = useMemo(() => {
    let result = schemeConfigs[0]?.schemeCode ?? "";

    const selected = schemeConfigs.find(
      (config) => config.schemeCode === selectedSchemeCode,
    );
    if (selected) {
      result = selected.schemeCode;
    }

    return result;
  }, [schemeConfigs, selectedSchemeCode]);

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
        <PageHeader title="全口座の資産配分" />
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
        <PageHeader title="全口座の資産配分" />
        <Alert variant="destructive">
          <AlertDescription>資産配分の対象となる明細がありません。</AlertDescription>
        </Alert>
      </PageContainer>
    );
    return result;
  }

  const merged = mergeSnapshotsForGlobalAnalysis(snapshots, schemeConfigs);
  const activeScheme = schemeConfigs.find(
    (config) => config.schemeCode === activeSchemeCode,
  );
  const allocation =
    activeScheme !== undefined
      ? buildAllocationBySchemeWithLinesFromSnapshots(
          snapshots,
          activeScheme.schemeCode,
          activeScheme.schemeName,
        )
      : null;

  result = (
    <PageContainer>
      <PageHeader
        title="全口座の資産配分"
        description={`総評価額: ${formatYen(merged.totalMarketValueMinor)}`}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">口座別内訳</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>口座</TableHead>
                <TableHead>基準日</TableHead>
                <TableHead>評価額</TableHead>
                <TableHead>構成比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {merged.portfolios.map((portfolio) => {
                let row = (
                  <TableRow key={portfolio.portfolioCode}>
                    <TableCell>
                      <Link
                        href={buildPortfolioPath(portfolio.portfolioCode, "analysis")}
                        className="font-medium hover:underline"
                      >
                        {portfolio.portfolioName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatAsOfDateJa(portfolio.asOfDate)}</TableCell>
                    <TableCell>{formatYen(portfolio.marketValueMinor)}</TableCell>
                    <TableCell>{formatAllocationPercent(portfolio.weight)}</TableCell>
                  </TableRow>
                );
                return row;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {schemeConfigs.length > 0 && allocation ? (
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
            const schemeAllocation = buildAllocationBySchemeWithLinesFromSnapshots(
              snapshots,
              config.schemeCode,
              config.schemeName,
            );

            let content = (
              <TabsContent key={config.schemeCode} value={config.schemeCode}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      全口座合算 — {config.schemeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AnalysisPanelSummary
                      axisTotalMinor={schemeAllocation.totalMarketValueMinor}
                      assetTotalMinor={merged.totalMarketValueMinor}
                    />
                    <AllocationPanel
                      slices={schemeAllocation.slices}
                      showPortfolioColumn
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            );
            return content;
          })}
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">
          横断分析に利用できる分類軸がありません。
        </p>
      )}
    </PageContainer>
  );
  return result;
}
