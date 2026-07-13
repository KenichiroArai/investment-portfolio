import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalAnalysisView } from "@/features/analysis/GlobalAnalysisView";

const snapshotFixture = {
  id: "s1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [{ schemeCode: "ideco_region", schemeName: "地域分類" }],
  metrics: [],
  lines: [
    {
      id: "l1",
      instrumentId: "i1",
      instrumentName: "テスト銘柄",
      accountId: "ideco:unknown",
      accountName: "不明口座",
      quantity: 1,
      marketValueMinor: 100_000,
      bookValueMinor: 80_000,
      metrics: [],
      instrumentAttributes: [],
      tags: [
        {
          schemeCode: "ideco_region",
          schemeName: "地域分類",
          valueCode: "domestic",
          valueName: "国内",
        },
      ],
    },
  ],
};

const trendsFixture = {
  portfolioCode: "ideco",
  points: [
    {
      asOfDate: "2026-01-31",
      totalMarketValueMinor: 90_000,
      totalBookValueMinor: 80_000,
      unrealizedGainMinor: 10_000,
      gainRateOnBook: 0.125,
      totalContributionsMinor: 80_000,
      gainRateOnContributions: 0.125,
      allocationsByScheme: {},
    },
    {
      asOfDate: "2026-06-01",
      totalMarketValueMinor: 100_000,
      totalBookValueMinor: 80_000,
      unrealizedGainMinor: 20_000,
      gainRateOnBook: 0.25,
      totalContributionsMinor: 80_000,
      gainRateOnContributions: 0.25,
      allocationsByScheme: {},
    },
  ],
};

function stubSuccessfulFetch(
  portfolios: Array<{ id: string; code: string; name: string; kind: string }>,
  snapshot: typeof snapshotFixture,
) {
  let result = vi.fn(async (url: string) => {
    if (url.includes("portfolios.json") || url.endsWith("/portfolios")) {
      return {
        ok: true,
        status: 200,
        json: async () => portfolios,
      };
    }
    if (url.includes("/trends") || url.includes("trends-summary.json")) {
      return {
        ok: true,
        status: 200,
        json: async () => trendsFixture,
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

describe("GlobalAnalysisView", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("shows loading skeleton initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = render(<GlobalAnalysisView />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders layout with combo chart, instrument donut values, and scrollable table", async () => {
    vi.stubGlobal(
      "fetch",
      stubSuccessfulFetch(
        [
          {
            id: "p1",
            code: "ideco",
            name: "iDeCo",
            kind: "ideco",
          },
        ],
        snapshotFixture,
      ),
    );

    const { container } = render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "全口座" })).toBeInTheDocument();
    });

    expect(screen.getByText("口座別構成")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "評価額・利益率の変化" }),
    ).toBeInTheDocument();
    expect(screen.getByText("銘柄別構成")).toBeInTheDocument();
    expect(screen.queryByText("銘柄ランキング")).not.toBeInTheDocument();
    expect(screen.getByText("銘柄一覧")).toBeInTheDocument();
    expect(screen.getAllByText("テスト銘柄").length).toBeGreaterThan(0);

    const legendMetrics = container.querySelector(
      ".allocation-chart__legend-metrics",
    );
    expect(legendMetrics).toBeTruthy();
    expect(legendMetrics?.textContent).toContain("100,000");
    expect(legendMetrics?.textContent).toContain("100.00%");

    const scrollContainer = container.querySelector(
      ".overflow-auto",
    ) as HTMLElement | null;
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer?.style.maxHeight).toBe("24rem");
  });

  it("shows error when portfolio list fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({}),
      })),
    );
    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(screen.getByText("口座一覧の取得に失敗しました。")).toBeInTheDocument();
    });
  });

  it("shows empty message when no snapshots load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("portfolios.json") || url.endsWith("/portfolios")) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: "p1",
                code: "ideco",
                name: "iDeCo",
                kind: "ideco",
              },
            ],
          };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }),
    );
    render(<GlobalAnalysisView />);
    await waitFor(() => {
      expect(screen.getByText("表示できる明細がありません。")).toBeInTheDocument();
    });
  });
});
