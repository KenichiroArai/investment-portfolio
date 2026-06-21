"use client";

import type { TargetAllocationsBySchemeDto } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";

import { getTargetAllocationsFetchUrl } from "@/lib/data-source";

export function useTargetAllocations(portfolioCode: string): {
  allocationsByScheme: TargetAllocationsBySchemeDto;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [allocationsByScheme, setAllocationsByScheme] =
    useState<TargetAllocationsBySchemeDto>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (): Promise<void> => {
    let result: void = undefined;
    setLoading(true);

    try {
      const response = await fetch(getTargetAllocationsFetchUrl(portfolioCode));
      if (!response.ok) {
        setAllocationsByScheme({});
        return result;
      }
      const data = (await response.json()) as TargetAllocationsBySchemeDto;
      setAllocationsByScheme(data);
    } catch {
      setAllocationsByScheme({});
    } finally {
      setLoading(false);
    }

    return result;
  }, [portfolioCode]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let loadResult: void = undefined;

      if (cancelled) {
        return loadResult;
      }

      await refetch();
      return loadResult;
    }

    void load();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [refetch]);

  let result = { allocationsByScheme, loading, refetch };
  return result;
}
