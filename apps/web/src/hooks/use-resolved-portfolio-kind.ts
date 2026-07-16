"use client";

import { useEffect, useState } from "react";

import { fetchPortfolio } from "@/lib/api-client";
import { findPortfolioByCode } from "@/lib/portfolio-catalog";
import { resolvePortfolioKind } from "@/lib/resolve-portfolio-kind";

/**
 * 設定・データ管理向けに口座 kind を解決する。
 * 静的カタログに無い口座（UI で新規作成した楽天証券など）は API から取得する。
 */
export function useResolvedPortfolioKind(
  portfolioCode: string,
  initialKind?: string,
): string {
  const catalogKind = findPortfolioByCode(portfolioCode)?.kind;
  const fallbackKind =
    (initialKind && initialKind.trim() !== "" ? initialKind : null) ??
    catalogKind ??
    resolvePortfolioKind(portfolioCode);

  const [kind, setKind] = useState(fallbackKind);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let result: void = undefined;

      if (catalogKind) {
        if (!cancelled) {
          setKind(catalogKind);
        }
        return result;
      }

      const response = await fetchPortfolio(portfolioCode);
      if (cancelled) {
        return result;
      }

      if (response.ok) {
        setKind(response.data.kind);
        return result;
      }

      setKind(resolvePortfolioKind(portfolioCode));
      return result;
    }

    void load();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode, catalogKind]);

  return kind;
}
