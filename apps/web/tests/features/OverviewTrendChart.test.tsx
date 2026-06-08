import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverviewTrendChart } from "@/features/trends/OverviewTrendChart";
import { renderWithPortfolioTime } from "../helpers/portfolio-time-test-utils";

describe("OverviewTrendChart", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders delta line chart when multiple buckets exist", async () => {
    const trendsResponse = {
      portfolioCode: "ideco",
      from: "2026-05-31",
      to: "2026-06-07",
      points: [
        {
          asOfDate: "2026-05-31",
          totalMarketValueMinor: 3_400_000,
          totalBookValueMinor: 3_000_000,
          unrealizedGainMinor: 400_000,
          gainRateOnBook: 0.13,
          totalContributionsMinor: null,
          gainRateOnContributions: null,
          allocationsByScheme: {},
        },
        {
          asOfDate: "2026-06-07",
          totalMarketValueMinor: 3_441_347,
          totalBookValueMinor: 2_982_226,
          unrealizedGainMinor: 459_121,
          gainRateOnBook: 0.15,
          totalContributionsMinor: null,
          gainRateOnContributions: null,
          allocationsByScheme: {},
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("trends")) {
          return {
            ok: true,
            status: 200,
            json: async () => trendsResponse,
          };
        }
        if (url.includes("snapshots-index") || url.endsWith("/snapshots")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              portfolioCode: "ideco",
              dates: [
                { asOfDate: "2026-05-31", isCurrent: false },
                { asOfDate: "2026-06-07", isCurrent: true },
              ],
            }),
          };
        }
        if (url.includes("snapshot/current") || url.includes("snapshots/2026")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: "s1",
              portfolioCode: "ideco",
              portfolioName: "iDeCo",
              asOfDate: "2026-06-07",
              analysisSchemes: [],
              metrics: [],
              lines: [],
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ portfolioCode: "ideco", dates: [] }),
        };
      }),
    );

    renderWithPortfolioTime(<OverviewTrendChart />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "資産推移" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "前回比の変化" })).toBeInTheDocument();
      expect(screen.getByLabelText("推移棒グラフ")).toBeInTheDocument();
      expect(screen.getByLabelText("推移折れ線グラフ")).toBeInTheDocument();
    });
  });
});
