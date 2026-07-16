"use client";

import type { ReactNode } from "react";

import { IdecoBulkImportTab } from "@/features/ideco/bulk-import/IdecoBulkImportTab";
import { MonexBulkImportTab } from "@/features/monex/bulk-import/MonexBulkImportTab";
import { RakutenBulkImportTab } from "@/features/rakuten/bulk-import/RakutenBulkImportTab";

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

  if (tabId === "monex-bulk-import") {
    result = (
      <MonexBulkImportTab
        portfolioCode={portfolioCode}
        asOfDate={asOfDate}
        disabled={disabled}
        onReload={onReload}
      />
    );
  }

  if (tabId === "rakuten-bulk-import") {
    result = (
      <RakutenBulkImportTab
        portfolioCode={portfolioCode}
        asOfDate={asOfDate}
        disabled={disabled}
        onReload={onReload}
      />
    );
  }

  return result;
}
