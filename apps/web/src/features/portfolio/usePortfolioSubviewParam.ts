"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export type PortfolioAllocationMainView = "details" | "allocation";
export type AnalysisMainView = "trends" | "allocation";
export type DetailsPanel = "holdings" | "trends";
export type HoldingsMode = "range" | "compare";

type PortfolioAllocationSubview = {
  page: "portfolio-allocation";
  mainView: PortfolioAllocationMainView;
  setMainView: (view: PortfolioAllocationMainView) => void;
  panel: DetailsPanel;
  setPanel: (panel: DetailsPanel) => void;
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

const PORTFOLIO_MAIN_VIEWS: PortfolioAllocationMainView[] = ["details", "allocation"];
const ANALYSIS_MAIN_VIEWS: AnalysisMainView[] = ["trends", "allocation"];
const DETAILS_PANELS: DetailsPanel[] = ["holdings", "trends"];
const HOLDINGS_MODES: HoldingsMode[] = ["range", "compare"];

function readPortfolioMainView(
  viewParam: string | null,
  panelParam: string | null,
): PortfolioAllocationMainView {
  let result: PortfolioAllocationMainView = "details";

  if (viewParam === "allocation") {
    result = "allocation";
    return result;
  }

  if (viewParam === "holdings" || viewParam === "trends" || viewParam === "details") {
    result = "details";
    return result;
  }

  if (viewParam === "compare") {
    result = "details";
    return result;
  }

  if (panelParam && DETAILS_PANELS.includes(panelParam as DetailsPanel)) {
    result = "details";
    return result;
  }

  return result;
}

function readDetailsPanel(
  viewParam: string | null,
  panelParam: string | null,
): DetailsPanel {
  let result: DetailsPanel = "holdings";

  if (panelParam === "trends") {
    result = "trends";
    return result;
  }

  if (panelParam === "holdings") {
    result = "holdings";
    return result;
  }

  if (viewParam === "trends") {
    result = "trends";
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

  return result;
}

export function usePortfolioSubviewParam(
  options: UsePortfolioSubviewParamOptions,
): UsePortfolioSubviewParamResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [localMainView, setLocalMainView] = useState<string | null>(null);
  const [localPanel, setLocalPanel] = useState<DetailsPanel | null>(null);
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
    let result: PortfolioAllocationMainView = "details";

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

  const panel = useMemo(() => {
    let result: DetailsPanel = "holdings";

    if (localPanel !== null) {
      result = localPanel;
      return result;
    }

    if (mainView === "allocation") {
      result = "holdings";
      return result;
    }

    result = readDetailsPanel(viewParam, panelParam);
    return result;
  }, [localPanel, mainView, panelParam, viewParam]);

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
        params.delete("view");
        params.delete("panel");
        params.delete("holdingsMode");
        if (view === "allocation") {
          params.set("view", "allocation");
          return;
        }
        params.set("panel", panel === "trends" ? "trends" : "holdings");
        if (holdingsMode === "compare") {
          params.set("holdingsMode", "compare");
        }
      });
      return result;
    },
    [holdingsMode, panel, replaceParams],
  );

  const setPanel = useCallback(
    (nextPanel: DetailsPanel) => {
      let result: void = undefined;
      setLocalPanel(nextPanel);
      setLocalMainView("details");
      replaceParams((params) => {
        params.delete("view");
        if (nextPanel === "holdings") {
          params.delete("panel");
        } else {
          params.set("panel", nextPanel);
        }
      });
      return result;
    },
    [replaceParams],
  );

  const setHoldingsMode = useCallback(
    (mode: HoldingsMode) => {
      let result: void = undefined;
      setLocalHoldingsMode(mode);
      setLocalPanel("holdings");
      setLocalMainView("details");
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
    panel,
    setPanel,
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
    view === "details" ||
    view === "holdings" ||
    view === "trends" ||
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
