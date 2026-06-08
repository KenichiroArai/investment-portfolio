import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { renderWithPortfolioTime } from "../helpers/portfolio-time-test-utils";

describe("TrendsDetailPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders monthly aggregated bar chart labels", async () => {
    const trendsResponse = {
      portfolioCode: "ideco",
      from: "2026-06-02",
      to: "2026-06-07",
      points: [
        {
          asOfDate: "2026-06-02",
          totalMarketValueMinor: 3400000,
          totalBookValueMinor: 3000000,
          unrealizedGainMinor: 400000,
          gainRateOnBook: 0.13,
          totalContributionsMinor: null,
          gainRateOnContributions: null,
          allocationsByScheme: {},
        },
        {
          asOfDate: "2026-06-07",
          totalMarketValueMinor: 3441347,
          totalBookValueMinor: 2982226,
          unrealizedGainMinor: 459121,
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
                { asOfDate: "2026-06-02", isCurrent: false },
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

    renderWithPortfolioTime(<TrendsDetailPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("月次表示（各月の最終基準日）・金額単位: 万円"),
      ).toBeInTheDocument();
      expect(screen.getAllByText("2026年6月").length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { name: "総資産" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "損益" })).toBeInTheDocument();
    });
  });
});
