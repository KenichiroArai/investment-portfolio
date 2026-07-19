"use client";

import type { ReactNode } from "react";

import type { AllocationSchemeTabItem } from "@/features/allocation/AllocationSchemeTabs";

type AnalysisTabPanelProps = {
  activeScheme: AllocationSchemeTabItem;
  renderOverview: (scheme: AllocationSchemeTabItem) => ReactNode;
  renderContent: (scheme: AllocationSchemeTabItem) => ReactNode;
};

export function AnalysisTabPanel({
  activeScheme,
  renderOverview,
  renderContent,
}: AnalysisTabPanelProps) {
  let result: ReactNode = (
    <div className="min-w-0 max-w-full space-y-4">
      {renderOverview(activeScheme)}
      {renderContent(activeScheme)}
    </div>
  );
  return result;
}
