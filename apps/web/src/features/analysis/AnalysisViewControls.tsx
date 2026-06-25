"use client";

import type { ReactNode } from "react";

import { AnalysisSchemeSelector } from "@/features/allocation/AnalysisSchemeSelector";
import type { AllocationSchemeTabItem } from "@/features/allocation/AllocationSchemeTabs";
import { Separator } from "@/components/ui/separator";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type AnalysisViewControlsProps = {
  schemes: AllocationSchemeTabItem[];
  activeSchemeCode: string;
  onSchemeChange: (schemeCode: string) => void;
  className?: string;
};

export function AnalysisViewControls({
  schemes,
  activeSchemeCode,
  onSchemeChange,
  className,
}: AnalysisViewControlsProps) {
  let result: ReactNode = (
    <div className={cn("mb-4 space-y-4", className)}>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          分析軸
        </h2>
        <AnalysisSchemeSelector
          schemes={schemes}
          activeSchemeCode={activeSchemeCode}
          onSchemeChange={onSchemeChange}
          variant="chip"
        />
      </section>
      <Separator />
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          表示
        </h2>
        <TabsList
          aria-label="資産配分の表示"
          className="grid h-11 w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1"
        >
          <TabsTrigger
            value="trends"
            className="h-full rounded-md text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            推移
          </TabsTrigger>
          <TabsTrigger
            value="allocation"
            className="h-full rounded-md text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            配分（リバランス）
          </TabsTrigger>
          <TabsTrigger
            value="snapshot"
            className="h-full rounded-md text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            資産配分
          </TabsTrigger>
        </TabsList>
      </section>
    </div>
  );
  return result;
}
