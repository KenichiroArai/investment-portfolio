import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HoldingsPage, {
  generateStaticParams,
} from "@/app/portfolios/[code]/holdings/page";
import { HoldingsView } from "@/features/portfolio/HoldingsView";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";

describe("HoldingsPage", () => {
  it("exposes static params for each portfolio", () => {
    expect(generateStaticParams()).toEqual(generatePortfolioStaticParams());
  });

  it("renders holdings view for portfolio code", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: {
          id: "s1",
          portfolioCode: "ideco",
          portfolioName: "iDeCo",
          asOfDate: "2026-06-01",
          analysisSchemes: [],
          metrics: [],
          lines: [],
        },
      }),
    );

    const element = await HoldingsPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(element).toEqual(<HoldingsView portfolioCode="ideco" />);

    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);

    await waitFor(() => {
      expect(screen.getByText(/期間内の明細がありません/)).toBeInTheDocument();
    });
  });
});
