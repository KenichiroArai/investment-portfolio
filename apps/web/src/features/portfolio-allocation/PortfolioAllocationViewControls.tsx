"use client";

import type { ReactNode } from "react";

import {
  prominentTabsListClassName,
  prominentTabsTriggerClassName,
} from "@/components/ui/prominent-tab-styles";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type PortfolioAllocationViewControlsProps = {
  className?: string;
};

export function PortfolioAllocationViewControls({
  className,
}: PortfolioAllocationViewControlsProps) {
  let result: ReactNode = (
    <div className={cn("mb-4 space-y-2", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        表示
      </h2>
      <TabsList
        aria-label="ポートフォリオ配分の表示"
        className={cn(prominentTabsListClassName, "grid-cols-4")}
      >
        <TabsTrigger value="holdings" className={prominentTabsTriggerClassName}>
          明細
        </TabsTrigger>
        <TabsTrigger value="composition" className={prominentTabsTriggerClassName}>
          構成比
        </TabsTrigger>
        <TabsTrigger value="trends" className={prominentTabsTriggerClassName}>
          推移
        </TabsTrigger>
        <TabsTrigger value="rebalance" className={prominentTabsTriggerClassName}>
          リバランス
        </TabsTrigger>
      </TabsList>
    </div>
  );
  return result;
}
