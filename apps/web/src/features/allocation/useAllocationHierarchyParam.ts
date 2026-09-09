"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

type UseAllocationHierarchyParamResult = {
  parentValueId: string | null;
  setParentValueId: (valueId: string | null) => void;
};

export function useAllocationHierarchyParam(): UseAllocationHierarchyParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parentValueId = searchParams.get("parent");

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

  let result: UseAllocationHierarchyParamResult = useMemo(
    () => ({
      parentValueId,
      setParentValueId,
    }),
    [parentValueId, setParentValueId],
  );

  return result;
}
