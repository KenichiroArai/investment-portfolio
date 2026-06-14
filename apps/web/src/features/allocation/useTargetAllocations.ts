"use client";

import type { TargetAllocationsBySchemeDto } from "@repo/shared";
import { useEffect, useState } from "react";

import { getTargetAllocationsFetchUrl } from "@/lib/data-source";

export function useTargetAllocations(portfolioCode: string): {
  allocationsByScheme: TargetAllocationsBySchemeDto;
  loading: boolean;
} {
  const [allocationsByScheme, setAllocationsByScheme] =
    useState<TargetAllocationsBySchemeDto>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let loadResult: void = undefined;
      setLoading(true);

      try {
        const response = await fetch(getTargetAllocationsFetchUrl(portfolioCode));
        if (cancelled) {
          return loadResult;
        }
        if (!response.ok) {
          setAllocationsByScheme({});
          return loadResult;
        }
        const data = (await response.json()) as TargetAllocationsBySchemeDto;
        setAllocationsByScheme(data);
      } catch {
        if (!cancelled) {
          setAllocationsByScheme({});
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

  let result = { allocationsByScheme, loading };
  return result;
}
