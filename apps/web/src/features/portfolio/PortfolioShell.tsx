"use client";

import { Suspense, type ReactNode } from "react";

import { PortfolioContextBar } from "@/components/PortfolioContextBar";
import { SnapshotTimeBar } from "@/components/SnapshotTimeBar";
import { PortfolioTimeProvider } from "@/features/portfolio/PortfolioTimeContext";

type PortfolioShellProps = {
  portfolioCode: string;
  children: ReactNode;
};

function PortfolioShellContent({
  portfolioCode,
  children,
}: PortfolioShellProps) {
  let result = (
    <PortfolioTimeProvider portfolioCode={portfolioCode}>
      <PortfolioContextBar portfolioCode={portfolioCode} />
      <SnapshotTimeBar />
      {children}
    </PortfolioTimeProvider>
  );
  return result;
}

export function PortfolioShell({ portfolioCode, children }: PortfolioShellProps) {
  let result = (
    <Suspense fallback={<PortfolioContextBar portfolioCode={portfolioCode} />}>
      <PortfolioShellContent portfolioCode={portfolioCode}>
        {children}
      </PortfolioShellContent>
    </Suspense>
  );
  return result;
}
