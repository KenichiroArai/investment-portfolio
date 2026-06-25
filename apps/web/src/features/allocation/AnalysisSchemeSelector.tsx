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
  variant?: "default" | "chip";
};

export function AnalysisSchemeSelector({
  schemes,
  activeSchemeCode,
  onSchemeChange,
  axisAriaLabel = "分析軸",
  className,
  variant = "default",
}: AnalysisSchemeSelectorProps) {
  let result: ReactNode = null;

  if (schemes.length === 0) {
    return result;
  }

  const isChipVariant = variant === "chip";

  result = (
    <div
      className={cn(
        isChipVariant
          ? "flex flex-wrap gap-2"
          : "analysis-axis-tabs trend-metric-tabs__subtabs",
        className,
      )}
      role="tablist"
      aria-label={axisAriaLabel}
    >
      {schemes.map((scheme) => {
        const isActive = scheme.schemeCode === activeSchemeCode;
        let schemeTab = (
          <button
            key={scheme.schemeCode}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={
              isChipVariant
                ? cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary/30"
                      : "border-border bg-card text-foreground hover:bg-accent",
                  )
                : isActive
                  ? "is-active"
                  : undefined
            }
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
