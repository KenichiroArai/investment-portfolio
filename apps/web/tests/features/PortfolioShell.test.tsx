import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortfolioShell } from "@/features/portfolio/PortfolioShell";
import { createPortfolioFetchMock } from "../helpers/portfolio-time-test-utils";

describe("PortfolioShell", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
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
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  });

  it("renders context bar, time bar, and children", async () => {
    render(
      <PortfolioShell portfolioCode="ideco">
        <p>shell-child</p>
      </PortfolioShell>,
    );
    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "口座メニュー" })).toBeInTheDocument();
    });
    expect(screen.getByText("shell-child")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "設定" })).not.toBeInTheDocument();
  });
});
