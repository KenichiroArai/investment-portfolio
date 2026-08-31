"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export type AllocationAggregationLevel = "parent" | "leaf";

type UseAllocationHierarchyParamResult = {
  parentValueId: string | null;
  aggregationLevel: AllocationAggregationLevel;
  includeOrphans: boolean;
  setParentValueId: (valueId: string | null) => void;
  setAggregationLevel: (level: AllocationAggregationLevel) => void;
  setIncludeOrphans: (include: boolean) => void;
};

function resolveAggregationLevel(raw: string | null): AllocationAggregationLevel {
  let result: AllocationAggregationLevel = "parent";

  if (raw === "leaf") {
    result = "leaf";
  }

  return result;
}

export function useAllocationHierarchyParam(): UseAllocationHierarchyParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parentValueId = searchParams.get("parent");
  const aggregationLevel = resolveAggregationLevel(searchParams.get("level"));
  const includeOrphans = searchParams.get("orphans") !== "exclude";

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      let result: void = undefined;
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`);
      return result;
    },
    [pathname, router, searchParams],
  );

  const setParentValueId = useCallback(
    (valueId: string | null) => {
      let result: void = undefined;
      replaceParams((params) => {
        if (!valueId) {
          params.delete("parent");
          return;
        }
        params.set("parent", valueId);
      });
      return result;
    },
    [replaceParams],
  );

  const setAggregationLevel = useCallback(
    (level: AllocationAggregationLevel) => {
      let result: void = undefined;
      replaceParams((params) => {
        if (level === "parent") {
          params.delete("level");
          return;
        }
        params.set("level", level);
      });
      return result;
    },
    [replaceParams],
  );

  const setIncludeOrphans = useCallback(
    (include: boolean) => {
      let result: void = undefined;
      replaceParams((params) => {
        if (include) {
          params.delete("orphans");
          return;
        }
        params.set("orphans", "exclude");
      });
      return result;
    },
    [replaceParams],
  );

  let result: UseAllocationHierarchyParamResult = useMemo(
    () => ({
      parentValueId,
      aggregationLevel,
      includeOrphans,
      setParentValueId,
      setAggregationLevel,
      setIncludeOrphans,
    }),
    [
      aggregationLevel,
      includeOrphans,
      parentValueId,
      setAggregationLevel,
      setIncludeOrphans,
      setParentValueId,
    ],
  );

  return result;
}
