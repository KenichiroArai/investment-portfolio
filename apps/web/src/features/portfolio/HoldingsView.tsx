"use client";

import { Suspense, type ReactNode } from "react";

import { LegacyPortfolioRouteRedirect } from "@/features/portfolio/LegacyPortfolioRouteRedirect";

type HoldingsViewProps = {
  portfolioCode: string;
};

export function HoldingsView({ portfolioCode }: HoldingsViewProps) {
  let result: ReactNode = (
    <Suspense fallback={null}>
      <LegacyPortfolioRouteRedirect portfolioCode={portfolioCode} target="holdings" />
    </Suspense>
  );
  return result;
}
