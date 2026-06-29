"use client";

import type { ReactNode } from "react";

import { IdecoBulkImportTab } from "@/features/ideco/bulk-import/IdecoBulkImportTab";

type PortfolioExtraDataTabContentProps = {
  tabId: string;
  portfolioCode: string;
  asOfDate: string;
  disabled: boolean;
  onReload: () => Promise<void>;
};

export function PortfolioExtraDataTabContent({
  tabId,
  portfolioCode,
  asOfDate,
  disabled,
  onReload,
}: PortfolioExtraDataTabContentProps) {
  let result: ReactNode = null;

  if (tabId === "ideco-bulk-import") {
    result = (
      <IdecoBulkImportTab
        portfolioCode={portfolioCode}
        asOfDate={asOfDate}
        disabled={disabled}
        onReload={onReload}
      />
    );
  }

  return result;
}
