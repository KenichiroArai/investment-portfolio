"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { buildPortfolioPath } from "@/lib/portfolio-path";

type LegacyPortfolioRouteRedirectProps = {
  portfolioCode: string;
  target: "holdings" | "trends";
};

function buildHoldingsRedirectUrl(
  portfolioCode: string,
  searchParams: URLSearchParams,
): string {
  let result = `${buildPortfolioPath(portfolioCode, "portfolio-allocation")}?view=details&panel=holdings`;
  const params = new URLSearchParams();

  const legacyView = searchParams.get("view");
  if (legacyView === "compare") {
    params.set("holdingsMode", "compare");
  }

  for (const key of ["scheme", "value", "asOf", "period", "from", "to"]) {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }

  const extra = params.toString();
  if (extra !== "") {
    result = `${result}&${extra}`;
  }

  return result;
}

function buildTrendsRedirectUrl(
  portfolioCode: string,
  searchParams: URLSearchParams,
): string {
  const scheme = searchParams.get("scheme");
  const metric = searchParams.get("metric");
  const isAllocationTrend =
    metric === "allocation" || (scheme !== null && scheme !== "");

  let result = "";

  if (isAllocationTrend) {
    const params = new URLSearchParams();
    params.set("view", "trends");
    if (scheme) {
      params.set("scheme", scheme);
    }
    if (metric) {
      params.set("metric", metric);
    }
    for (const key of ["period", "from", "to", "asOf"]) {
      const value = searchParams.get(key);
      if (value) {
        params.set(key, value);
      }
    }
    result = `${buildPortfolioPath(portfolioCode, "analysis")}?${params.toString()}`;
    return result;
  }

  const params = new URLSearchParams();
  params.set("view", "details");
  params.set("panel", "trends");
  if (metric) {
    params.set("metric", metric);
  }
  for (const key of ["period", "from", "to", "asOf"]) {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  }
  result = `${buildPortfolioPath(portfolioCode, "portfolio-allocation")}?${params.toString()}`;
  return result;
}

export function LegacyPortfolioRouteRedirect({
  portfolioCode,
  target,
}: LegacyPortfolioRouteRedirectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let result: void = undefined;

    const href =
      target === "holdings"
        ? buildHoldingsRedirectUrl(portfolioCode, searchParams)
        : buildTrendsRedirectUrl(portfolioCode, searchParams);

    router.replace(href);
    return result;
  }, [portfolioCode, router, searchParams, target]);

  return null;
}
