"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { isWritableDataSource } from "@/lib/data-source";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type AllocationCrossLinkProps = {
  portfolioCode: string;
  target: "analysis" | "trends";
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
  let result = buildPortfolioPath(portfolioCode, target);
  const params = new URLSearchParams();

  if (schemeCode !== "") {
    params.set("scheme", schemeCode);
  }

  if (asOfDate) {
    params.set("asOf", asOfDate);
  }

  if (metric && target === "trends") {
    params.set("metric", metric);
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
  if (target === "analysis" && !isWritableDataSource()) {
    let result: ReactNode = null;
    return result;
  }

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
