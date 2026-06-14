"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import type { ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { AnalysisPanelSummary } from "@/features/analysis/AnalysisPanelSummary";

type AllocationSnapshotPanelProps = {
  slices: AllocationSliceWithLines[];
  axisTotalMinor: number;
  assetTotalMinor: number;
  targetTotalRatio?: number | null;
  showPortfolioColumn?: boolean;
  portfolioCode?: string;
  schemeCode?: string;
  asOfDate?: string | null;
};

export function AllocationSnapshotPanel({
  slices,
  axisTotalMinor,
  assetTotalMinor,
  targetTotalRatio = null,
  showPortfolioColumn = false,
  portfolioCode,
  schemeCode,
  asOfDate,
}: AllocationSnapshotPanelProps) {
  let result: ReactNode = (
    <div className="allocation-snapshot-panel space-y-4">
      <AnalysisPanelSummary
        axisTotalMinor={axisTotalMinor}
        assetTotalMinor={assetTotalMinor}
        targetTotalRatio={targetTotalRatio}
      />
      <AllocationPanel
        slices={slices}
        showPortfolioColumn={showPortfolioColumn}
        portfolioCode={portfolioCode}
        schemeCode={schemeCode}
        asOfDate={asOfDate}
      />
    </div>
  );
  return result;
}
