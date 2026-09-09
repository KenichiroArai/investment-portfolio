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
  valueIdByCode?: Map<string, string>;
  descriptionByValueCode?: Map<string, string | null>;
  drillDownValueIds?: Set<string>;
  onDrillDown?: (valueId: string) => void;
  hierarchyControls?: ReactNode;
};

export function AllocationSnapshotPanel({
  slices,
  showPortfolioColumn = false,
  portfolioCode,
  schemeCode,
  asOfDate,
  valueIdByCode,
  descriptionByValueCode,
  drillDownValueIds,
  onDrillDown,
  hierarchyControls,
}: AllocationSnapshotPanelProps) {
  let result: ReactNode = (
    <div className="allocation-snapshot-panel min-w-0 max-w-full space-y-4">
      {hierarchyControls}
      <AllocationPanel
        slices={slices}
        showPortfolioColumn={showPortfolioColumn}
        portfolioCode={portfolioCode}
        schemeCode={schemeCode}
        asOfDate={asOfDate}
        valueIdByCode={valueIdByCode}
        descriptionByValueCode={descriptionByValueCode}
        drillDownValueIds={drillDownValueIds}
        onDrillDown={onDrillDown}
      />
    </div>
  );
  return result;
}
