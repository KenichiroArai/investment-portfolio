"use client";

import type { ReactNode } from "react";

import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";

type TrendsViewProps = {
  portfolioCode: string;
};

export function TrendsView({ portfolioCode }: TrendsViewProps) {
  let result: ReactNode = (
    <main>
      <h1>推移</h1>
      <p className="holdings-meta">口座: {portfolioCode}</p>
      <TrendsDetailPanel />
    </main>
  );
  return result;
}
