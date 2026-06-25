"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export type PortfolioAllocationMainView = "holdings" | "trends" | "allocation";
export type AnalysisMainView = "trends" | "allocation" | "snapshot";
export type HoldingsMode = "range" | "compare";

type PortfolioAllocationSubview = {
  page: "portfolio-allocation";
  mainView: PortfolioAllocationMainView;
  setMainView: (view: PortfolioAllocationMainView) => void;
  holdingsMode: HoldingsMode;
  setHoldingsMode: (mode: HoldingsMode) => void;
};

type AnalysisSubview = {
  page: "analysis";
  mainView: AnalysisMainView;
  setMainView: (view: AnalysisMainView) => void;
};

type UsePortfolioSubviewParamOptions =
  | { page: "portfolio-allocation" }
  | { page: "analysis" };

type UsePortfolioSubviewParamResult = PortfolioAllocationSubview | AnalysisSubview;

const PORTFOLIO_MAIN_VIEWS: PortfolioAllocationMainView[] = [
  "holdings",
  "trends",
  "allocation",
];
const ANALYSIS_MAIN_VIEWS: AnalysisMainView[] = ["trends", "allocation", "snapshot"];

function readPortfolioMainView(
  viewParam: string | null,
  panelParam: string | null,
): PortfolioAllocationMainView {
  let result: PortfolioAllocationMainView = "holdings";

  if (viewParam === "allocation") {
    result = "allocation";
    return result;
  }

  if (viewParam === "trends") {
    result = "trends";
    return result;
  }

  if (viewParam === "holdings") {
    result = "holdings";
    return result;
  }

  if (viewParam === "details" || viewParam === "compare") {
    result = "holdings";
    return result;
  }

  if (panelParam === "trends") {
    result = "trends";
    return result;
  }

  if (panelParam === "holdings") {
    result = "holdings";
    return result;
  }

  return result;
}

function readHoldingsMode(
  holdingsModeParam: string | null,
  viewParam: string | null,
): HoldingsMode {
  let result: HoldingsMode = "range";

  if (holdingsModeParam === "compare") {
    result = "compare";
    return result;
  }

  if (viewParam === "compare") {
    result = "compare";
    return result;
  }

  return result;
}

function readAnalysisMainView(viewParam: string | null): AnalysisMainView {
  let result: AnalysisMainView = "trends";

  if (viewParam === "allocation") {
    result = "allocation";
    return result;
  }

  if (viewParam === "snapshot") {
    result = "snapshot";
    return result;
  }

  return result;
}

export function usePortfolioSubviewParam(
  options: { page: "analysis" },
): AnalysisSubview;
export function usePortfolioSubviewParam(
  options: { page: "portfolio-allocation" },
): PortfolioAllocationSubview;
export function usePortfolioSubviewParam(
  options: UsePortfolioSubviewParamOptions,
): UsePortfolioSubviewParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localMainView, setLocalMainView] = useState<string | null>(null);
  const [localHoldingsMode, setLocalHoldingsMode] = useState<HoldingsMode | null>(null);

  const viewParam = searchParams.get("view");
  const panelParam = searchParams.get("panel");
  const holdingsModeParam = searchParams.get("holdingsMode");

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

  if (options.page === "analysis") {
    const mainView = useMemo(() => {
      let result: AnalysisMainView = "trends";

      if (localMainView !== null && ANALYSIS_MAIN_VIEWS.includes(localMainView as AnalysisMainView)) {
        result = localMainView as AnalysisMainView;
        return result;
      }

      result = readAnalysisMainView(viewParam);
      return result;
    }, [localMainView, viewParam]);

    const setMainView = useCallback(
      (view: AnalysisMainView) => {
        let result: void = undefined;
        setLocalMainView(view);
        replaceParams((params) => {
          if (view === "trends") {
            params.delete("view");
            return;
          }
          params.set("view", view);
        });
        return result;
      },
      [replaceParams],
    );

    let analysisResult: AnalysisSubview = {
      page: "analysis",
      mainView,
      setMainView,
    };
    return analysisResult;
  }

  const mainView = useMemo(() => {
    let result: PortfolioAllocationMainView = "holdings";

    if (
      localMainView !== null &&
      PORTFOLIO_MAIN_VIEWS.includes(localMainView as PortfolioAllocationMainView)
    ) {
      result = localMainView as PortfolioAllocationMainView;
      return result;
    }

    result = readPortfolioMainView(viewParam, panelParam);
    return result;
  }, [localMainView, panelParam, viewParam]);

  const holdingsMode = useMemo(() => {
    let result: HoldingsMode = "range";

    if (localHoldingsMode !== null) {
      result = localHoldingsMode;
      return result;
    }

    result = readHoldingsMode(holdingsModeParam, viewParam);
    return result;
  }, [holdingsModeParam, localHoldingsMode, viewParam]);

  const setMainView = useCallback(
    (view: PortfolioAllocationMainView) => {
      let result: void = undefined;
      setLocalMainView(view);
      replaceParams((params) => {
        params.delete("panel");
        if (view === "holdings") {
          params.delete("view");
          if (holdingsMode === "compare") {
            params.set("holdingsMode", "compare");
          } else {
            params.delete("holdingsMode");
          }
          return;
        }
        params.delete("holdingsMode");
        if (view === "trends") {
          params.set("view", "trends");
          return;
        }
        params.set("view", "allocation");
      });
      return result;
    },
    [holdingsMode, replaceParams],
  );

  const setHoldingsMode = useCallback(
    (mode: HoldingsMode) => {
      let result: void = undefined;
      setLocalHoldingsMode(mode);
      setLocalMainView("holdings");
      replaceParams((params) => {
        params.delete("view");
        params.delete("panel");
        if (mode === "range") {
          params.delete("holdingsMode");
          return;
        }
        params.set("holdingsMode", mode);
      });
      return result;
    },
    [replaceParams],
  );

  let portfolioResult: PortfolioAllocationSubview = {
    page: "portfolio-allocation",
    mainView,
    setMainView,
    holdingsMode,
    setHoldingsMode,
  };
  return portfolioResult;
}

export function isDetailsOrTrendsSubview(searchParams: URLSearchParams): boolean {
  let result = false;
  const view = searchParams.get("view");
  const panel = searchParams.get("panel");

  if (view === "allocation") {
    return result;
  }

  if (
    view === "holdings" ||
    view === "trends" ||
    view === "details" ||
    view === "compare" ||
    panel === "holdings" ||
    panel === "trends" ||
    (view === null && panel === null)
  ) {
    result = true;
  }

  return result;
}

export function isTrendsSubview(searchParams: URLSearchParams): boolean {
  let result = false;
  const view = searchParams.get("view");
  const panel = searchParams.get("panel");

  if (view === "trends" || panel === "trends") {
    result = true;
    return result;
  }

  if (view === "allocation") {
    return result;
  }

  return result;
}
