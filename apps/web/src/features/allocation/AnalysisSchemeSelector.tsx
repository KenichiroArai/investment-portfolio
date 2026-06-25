"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { AllocationSchemeTabItem } from "@/features/allocation/AllocationSchemeTabs";

type AnalysisSchemeSelectorProps = {
  schemes: AllocationSchemeTabItem[];
  activeSchemeCode: string;
  onSchemeChange: (schemeCode: string) => void;
  axisAriaLabel?: string;
  className?: string;
};

export function AnalysisSchemeSelector({
  schemes,
  activeSchemeCode,
  onSchemeChange,
  axisAriaLabel = "分析軸",
  className,
}: AnalysisSchemeSelectorProps) {
  let result: ReactNode = null;

  if (schemes.length === 0) {
    return result;
  }

  result = (
    <div
      className={cn("analysis-axis-tabs trend-metric-tabs__subtabs", className)}
      role="tablist"
      aria-label={axisAriaLabel}
    >
      {schemes.map((scheme) => {
        let schemeTab = (
          <button
            key={scheme.schemeCode}
            type="button"
            role="tab"
            aria-selected={scheme.schemeCode === activeSchemeCode}
            className={scheme.schemeCode === activeSchemeCode ? "is-active" : undefined}
            onClick={() => {
              onSchemeChange(scheme.schemeCode);
            }}
          >
            {scheme.schemeName}
          </button>
        );
        return schemeTab;
      })}
    </div>
  );
  return result;
}
