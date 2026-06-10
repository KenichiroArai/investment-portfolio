import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioOverviewView } from "@/features/portfolio/PortfolioOverviewView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";

const snapshotFixture = {
  id: "s1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [],
  metrics: [],
  lines: [
    {
      id: "l1",
      instrumentId: "i1",
      instrumentName: "テスト銘柄",
      quantity: 1,
      marketValueMinor: 100_000,
      bookValueMinor: 80_000,
      metrics: [],
      instrumentAttributes: [],
      tags: [],
    },
  ],
};

describe("PortfolioOverviewView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows loading skeleton initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = renderWithPortfolioTime(
      <PortfolioOverviewView portfolioCode="ideco" />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders overview stats and trend chart card", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );
    renderWithPortfolioTime(<PortfolioOverviewView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "資産状況" })).toBeInTheDocument();
    });
    expect(screen.getByText("資産残高")).toBeInTheDocument();
    expect(screen.getByText("拠出金累計")).toBeInTheDocument();
    expect(screen.getByText("損益")).toBeInTheDocument();
    expect(screen.getByText("資産推移")).toBeInTheDocument();
  });

  it("shows error when fetch fails", async () => {
    vi.stubGlobal("fetch", createPortfolioFetchMock({ failFetch: true }));
    renderWithPortfolioTime(<PortfolioOverviewView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/API に接続できません/)).toBeInTheDocument();
    });
  });

  it("shows empty snapshot message", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: null,
      }),
    );
    renderWithPortfolioTime(<PortfolioOverviewView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("明細がありません。")).toBeInTheDocument();
    });
  });
});
