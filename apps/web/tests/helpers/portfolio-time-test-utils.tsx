import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

import { PortfolioTimeProvider } from "@/features/portfolio/PortfolioTimeContext";
import { portfolioTimeNavigationState } from "./portfolio-time-navigation-state";

type SnapshotFixture = {
  id: string;
  portfolioCode: string;
  portfolioName: string;
  asOfDate: string;
  analysisSchemes: Array<{ schemeCode: string; schemeName: string }>;
  metrics: unknown[];
  lines: unknown[];
};

type PortfolioFetchMockOptions = {
  snapshot?: SnapshotFixture | null;
  snapshotsByDate?: Record<string, SnapshotFixture>;
  dates?: Array<{ asOfDate: string; isCurrent: boolean }>;
  datesStatus?: number;
  snapshotStatus?: number;
  failFetch?: boolean;
};

export function createPortfolioFetchMock(options: PortfolioFetchMockOptions = {}) {
  const snapshot: SnapshotFixture = options.snapshot ?? {
    id: "s1",
    portfolioCode: "ideco",
    portfolioName: "iDeCo",
    asOfDate: "2026-06-01",
    analysisSchemes: [],
    metrics: [],
    lines: [],
  };
  const snapshotsByDate = options.snapshotsByDate ?? {};
  const dates = options.dates ?? [
    { asOfDate: snapshot.asOfDate, isCurrent: true },
  ];

  function resolveSnapshotForUrl(url: string): SnapshotFixture | null {
    let result: SnapshotFixture | null = snapshot;
    const dateMatch = /snapshots\/(\d{4}-\d{2}-\d{2})/.exec(url);
    if (dateMatch) {
      const date = dateMatch[1];
      if (date && snapshotsByDate[date]) {
        result = snapshotsByDate[date];
        return result;
      }
      if (options.snapshot === null) {
        result = null;
        return result;
      }
      result = { ...snapshot, asOfDate: date ?? snapshot.asOfDate };
      return result;
    }
    return result;
  }

  let result = vi.fn(async (url: string) => {
    if (options.failFetch) {
      throw new Error("network");
    }

    if (url.includes("trends")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          portfolioCode: "ideco",
          from: dates[0]?.asOfDate ?? "",
          to: dates[dates.length - 1]?.asOfDate ?? "",
          points: [],
        }),
      };
    }

    if (url.includes("snapshots-index")) {
      const status = options.datesStatus ?? 200;
      if (status === 404) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          portfolioCode: "ideco",
          dates,
        }),
      };
    }

    if (url.includes("snapshot/current") || /snapshots\/\d{4}-\d{2}-\d{2}/.test(url)) {
      const status = options.snapshotStatus ?? 200;
      const resolvedSnapshot = resolveSnapshotForUrl(url);
      if (status === 404 || resolvedSnapshot === null) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }
      if (status !== 200) {
        return {
          ok: false,
          status,
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => resolvedSnapshot,
      };
    }

    if (url.endsWith("/snapshots")) {
      const status = options.datesStatus ?? 200;
      if (status === 404) {
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          portfolioCode: "ideco",
          dates,
        }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => snapshot,
    };
  });

  return result;
}

type RenderWithPortfolioTimeOptions = Omit<RenderOptions, "wrapper"> & {
  initialSearchParams?: string | URLSearchParams;
  pathname?: string;
};

function PortfolioTimeTestWrapper({ children }: { children: ReactNode }) {
  let result = (
    <PortfolioTimeProvider portfolioCode="ideco">{children}</PortfolioTimeProvider>
  );
  return result;
}

export function renderWithPortfolioTime(
  ui: ReactElement,
  options?: RenderWithPortfolioTimeOptions,
) {
  if (options?.pathname) {
    portfolioTimeNavigationState.pathname = options.pathname;
  } else {
    portfolioTimeNavigationState.pathname = "/portfolios/ideco/trends";
  }

  if (options?.initialSearchParams) {
    portfolioTimeNavigationState.searchParams =
      typeof options.initialSearchParams === "string"
        ? new URLSearchParams(options.initialSearchParams)
        : options.initialSearchParams;
  } else {
    portfolioTimeNavigationState.searchParams = new URLSearchParams();
  }

  let result = render(ui, {
    wrapper: PortfolioTimeTestWrapper,
    ...options,
  });
  return result;
}
