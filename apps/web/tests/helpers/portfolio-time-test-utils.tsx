import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";

import { PortfolioTimeProvider } from "@/features/portfolio/PortfolioTimeContext";

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
  const dates = options.dates ?? [
    { asOfDate: snapshot.asOfDate, isCurrent: true },
  ];

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
      if (status === 404 || options.snapshot === null) {
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
        json: async () => snapshot,
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

function PortfolioTimeTestWrapper({ children }: { children: ReactNode }) {
  let result = (
    <PortfolioTimeProvider portfolioCode="ideco">{children}</PortfolioTimeProvider>
  );
  return result;
}

export function renderWithPortfolioTime(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  let result = render(ui, {
    wrapper: PortfolioTimeTestWrapper,
    ...options,
  });
  return result;
}
