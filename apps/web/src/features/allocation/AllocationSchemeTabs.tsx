"use client";

import type { ReactNode } from "react";

import { AnalysisSchemeSelector } from "@/features/allocation/AnalysisSchemeSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type AllocationSchemeTabItem = {
  schemeCode: string;
  schemeName: string;
};

type AllocationSchemeTabsProps = {
  schemes: AllocationSchemeTabItem[];
  activeSchemeCode: string;
  onSchemeChange: (schemeCode: string) => void;
  renderPanel: (scheme: AllocationSchemeTabItem) => ReactNode;
  className?: string;
  variant?: "tabs" | "buttons";
  axisAriaLabel?: string;
};

export function AllocationSchemeTabs({
  schemes,
  activeSchemeCode,
  onSchemeChange,
  renderPanel,
  className,
  variant = "tabs",
  axisAriaLabel = "構成比の分析軸",
}: AllocationSchemeTabsProps) {
  let result: ReactNode = null;

  if (schemes.length === 0) {
    return result;
  }

  if (variant === "buttons") {
    const activeScheme =
      schemes.find((scheme) => scheme.schemeCode === activeSchemeCode) ?? schemes[0];

    result = (
      <div className={cn("space-y-4", className)}>
        <AnalysisSchemeSelector
          schemes={schemes}
          activeSchemeCode={activeSchemeCode}
          onSchemeChange={onSchemeChange}
          axisAriaLabel={axisAriaLabel}
        />
        {renderPanel(activeScheme)}
      </div>
    );
    return result;
  }

  result = (
    <Tabs
      value={activeSchemeCode}
      onValueChange={onSchemeChange}
      className={cn("space-y-4", className)}
    >
      <TabsList className="flex h-auto flex-wrap">
        {schemes.map((scheme) => {
          let tab = (
            <TabsTrigger key={scheme.schemeCode} value={scheme.schemeCode}>
              {scheme.schemeName}
            </TabsTrigger>
          );
          return tab;
        })}
      </TabsList>
      {schemes.map((scheme) => {
        let content = (
          <TabsContent key={scheme.schemeCode} value={scheme.schemeCode}>
            {renderPanel(scheme)}
          </TabsContent>
        );
        return content;
      })}
    </Tabs>
  );
  return result;
}
