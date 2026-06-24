"use client";

import type { ReactNode } from "react";

import { HoldingsDetailPanel } from "@/features/portfolio/HoldingsDetailPanel";
import type { DetailsPanel, HoldingsMode } from "@/features/portfolio/usePortfolioSubviewParam";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PortfolioDetailsPanelProps = {
  portfolioCode: string;
  panel: DetailsPanel;
  onPanelChange: (panel: DetailsPanel) => void;
  holdingsMode: HoldingsMode;
  onHoldingsModeChange: (mode: HoldingsMode) => void;
};

const PANEL_LABELS: Record<DetailsPanel, string> = {
  holdings: "明細",
  trends: "推移",
};

export function PortfolioDetailsPanel({
  portfolioCode,
  panel,
  onPanelChange,
  holdingsMode,
  onHoldingsModeChange,
}: PortfolioDetailsPanelProps) {
  let result: ReactNode = (
    <Tabs
      value={panel}
      onValueChange={(value) => {
        onPanelChange(value as DetailsPanel);
      }}
    >
      <TabsList className="h-9">
        {(Object.keys(PANEL_LABELS) as DetailsPanel[]).map((panelKey) => {
          let trigger = (
            <TabsTrigger key={panelKey} value={panelKey} className="text-sm">
              {PANEL_LABELS[panelKey]}
            </TabsTrigger>
          );
          return trigger;
        })}
      </TabsList>
      <TabsContent value="holdings" className="mt-4">
        <HoldingsDetailPanel
          portfolioCode={portfolioCode}
          holdingsMode={holdingsMode}
          onHoldingsModeChange={onHoldingsModeChange}
        />
      </TabsContent>
      <TabsContent value="trends" className="mt-4">
        <TrendsDetailPanel portfolioCode={portfolioCode} mode="portfolio" />
      </TabsContent>
    </Tabs>
  );
  return result;
}
