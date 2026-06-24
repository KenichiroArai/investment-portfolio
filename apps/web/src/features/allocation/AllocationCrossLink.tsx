"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type AllocationCrossLinkProps = {
  portfolioCode: string;
  target: "analysis" | "analysis-trends" | "portfolio-trends" | "holdings";
  schemeCode: string;
  asOfDate?: string | null;
  metric?: "allocation" | "market-value" | "gain" | "gain-rate";
  label: string;
};

function buildHref({
  portfolioCode,
  target,
  schemeCode,
  asOfDate,
  metric,
}: Omit<AllocationCrossLinkProps, "label">): string {
  let result = "";
  const params = new URLSearchParams();

  if (schemeCode !== "") {
    params.set("scheme", schemeCode);
  }

  if (asOfDate) {
    params.set("asOf", asOfDate);
  }

  if (target === "analysis") {
    result = buildPortfolioPath(portfolioCode, "analysis");
    params.set("view", "allocation");
  } else if (target === "analysis-trends") {
    result = buildPortfolioPath(portfolioCode, "analysis");
    params.set("view", "trends");
    if (metric) {
      params.set("metric", metric);
    }
  } else if (target === "portfolio-trends") {
    result = buildPortfolioPath(portfolioCode, "portfolio-allocation");
    params.set("view", "details");
    params.set("panel", "trends");
    if (metric) {
      params.set("metric", metric);
    }
  } else {
    result = buildPortfolioPath(portfolioCode, "portfolio-allocation");
    params.set("view", "details");
    params.set("panel", "holdings");
  }

  const query = params.toString();
  if (query !== "") {
    result = `${result}?${query}`;
  }

  return result;
}

export function AllocationCrossLink({
  portfolioCode,
  target,
  schemeCode,
  asOfDate,
  metric,
  label,
}: AllocationCrossLinkProps) {
  const href = buildHref({
    portfolioCode,
    target,
    schemeCode,
    asOfDate,
    metric,
  });

  let result: ReactNode = (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>
        <ArrowRightLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
  return result;
}
