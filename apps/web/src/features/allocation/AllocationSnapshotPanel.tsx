"use client";

import type { AllocationSliceWithLines } from "@repo/shared";
import type { ReactNode } from "react";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";

type AllocationSnapshotPanelProps = {
  slices: AllocationSliceWithLines[];
  showPortfolioColumn?: boolean;
  portfolioCode?: string;
  schemeCode?: string;
  asOfDate?: string | null;
};

export function AllocationSnapshotPanel({
  slices,
  showPortfolioColumn = false,
  portfolioCode,
  schemeCode,
  asOfDate,
}: AllocationSnapshotPanelProps) {
  let result: ReactNode = (
    <div className="allocation-snapshot-panel space-y-4">
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
