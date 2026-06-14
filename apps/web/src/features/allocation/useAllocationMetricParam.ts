"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export type TrendMetricTab = "allocation" | "market-value" | "gain" | "gain-rate";

type UseAllocationMetricParamOptions = {
  defaultMetric: TrendMetricTab;
};

type UseAllocationMetricParamResult = {
  activeMetric: TrendMetricTab;
  setActiveMetric: (metric: TrendMetricTab) => void;
};

const VALID_METRICS: TrendMetricTab[] = [
  "allocation",
  "market-value",
  "gain",
  "gain-rate",
];

function readMetric(value: string | null): TrendMetricTab | null {
  let result: TrendMetricTab | null = null;

  if (value && VALID_METRICS.includes(value as TrendMetricTab)) {
    result = value as TrendMetricTab;
  }

  return result;
}

export function useAllocationMetricParam({
  defaultMetric,
}: UseAllocationMetricParamOptions): UseAllocationMetricParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localMetric, setLocalMetric] = useState<TrendMetricTab | null>(null);

  const metricFromUrl = searchParams.get("metric");

  const activeMetric = useMemo(() => {
    let result = defaultMetric;

    if (localMetric !== null) {
      result = localMetric;
      return result;
    }

    const fromUrl = readMetric(metricFromUrl);
    if (fromUrl) {
      result = fromUrl;
    }

    return result;
  }, [defaultMetric, localMetric, metricFromUrl]);

  const setActiveMetric = useCallback(
    (metric: TrendMetricTab) => {
      let result: void = undefined;
      setLocalMetric(metric);

      const params = new URLSearchParams(searchParams.toString());

      if (metric === defaultMetric) {
        params.delete("metric");
      } else {
        params.set("metric", metric);
      }

      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`);
      return result;
    },
    [defaultMetric, pathname, router, searchParams],
  );

  let result: UseAllocationMetricParamResult = {
    activeMetric,
    setActiveMetric,
  };
  return result;
}
