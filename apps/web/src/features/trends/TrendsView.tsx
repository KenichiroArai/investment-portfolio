"use client";

import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";

type TrendsViewProps = {
  portfolioCode: string;
};

export function TrendsView({ portfolioCode }: TrendsViewProps) {
  let result: ReactNode = (
    <PageContainer>
      <PageHeader
        title="推移"
        description={`口座: ${portfolioCode}`}
      />
      <TrendsDetailPanel />
    </PageContainer>
  );
  return result;
}
