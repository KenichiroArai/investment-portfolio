"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type UseAllocationSchemeParamOptions = {
  schemeCodes: string[];
};

type UseAllocationSchemeParamResult = {
  activeSchemeCode: string;
  setActiveSchemeCode: (schemeCode: string) => void;
};

export function useAllocationSchemeParam({
  schemeCodes,
}: UseAllocationSchemeParamOptions): UseAllocationSchemeParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localSchemeCode, setLocalSchemeCode] = useState<string | null>(null);

  const schemeFromUrl = searchParams.get("scheme");

  const activeSchemeCode = useMemo(() => {
    let result = schemeCodes[0] ?? "";

    if (localSchemeCode !== null && schemeCodes.includes(localSchemeCode)) {
      result = localSchemeCode;
      return result;
    }

    if (schemeFromUrl && schemeCodes.includes(schemeFromUrl)) {
      result = schemeFromUrl;
    }

    return result;
  }, [localSchemeCode, schemeCodes, schemeFromUrl]);

  const setActiveSchemeCode = useCallback(
    (schemeCode: string) => {
      let result: void = undefined;
      setLocalSchemeCode(schemeCode);

      const params = new URLSearchParams(searchParams.toString());

      if (schemeCode === "" || schemeCode === schemeCodes[0]) {
        params.delete("scheme");
      } else {
        params.set("scheme", schemeCode);
      }

      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`);
      return result;
    },
    [pathname, router, schemeCodes, searchParams],
  );

  let result: UseAllocationSchemeParamResult = {
    activeSchemeCode,
    setActiveSchemeCode,
  };
  return result;
}
