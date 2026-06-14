"use client";

import type { TargetPortfolioWeightDto } from "@repo/shared";
import { useEffect, useState } from "react";

import { getTargetPortfolioWeightsFetchUrl } from "@/lib/data-source";

export function useTargetPortfolioWeights(portfolioCode: string): {
  weights: TargetPortfolioWeightDto[];
  loading: boolean;
} {
  const [weights, setWeights] = useState<TargetPortfolioWeightDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let loadResult: void = undefined;
      setLoading(true);

      try {
        const response = await fetch(getTargetPortfolioWeightsFetchUrl(portfolioCode));
        if (cancelled) {
          return loadResult;
        }
        if (!response.ok) {
          setWeights([]);
          return loadResult;
        }
        const data = (await response.json()) as { weights: TargetPortfolioWeightDto[] };
        setWeights(data.weights ?? []);
      } catch {
        if (!cancelled) {
          setWeights([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      return loadResult;
    }

    void load();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode]);

  let result = { weights, loading };
  return result;
}
