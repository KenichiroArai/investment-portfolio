import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioAllocationView } from "@/features/portfolio-allocation/PortfolioAllocationView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";
import { portfolioTimeNavigationState } from "../helpers/portfolio-time-navigation-state";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => portfolioTimeNavigationState.pathname,
  useSearchParams: () => portfolioTimeNavigationState.searchParams,
}));

const snapshotFixture = {
  id: "snap-1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [{ schemeCode: "ideco_region", schemeName: "地域分類" }],
  metrics: [],
  lines: [
    {
      id: "line-1",
      instrumentId: "inst-1",
      instrumentName: "テスト銘柄",
      sortOrder: 0,
      quantity: 1,
      marketValueMinor: 100_000,
      bookValueMinor: null,
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

describe("PortfolioAllocationView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders allocation panel without analysis axis", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
        targetPortfolioWeights: [{ instrumentId: "inst-1", targetRatio: 0.5 }],
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("銘柄別構成比")).toBeInTheDocument();
    });

    expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getByText(/合計買い/)).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "分析軸" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "資産配分目標" }),
    ).not.toBeInTheDocument();
  });

  it("shows rebalance section in static mode", async () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("銘柄別構成比")).toBeInTheDocument();
    });

    expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getByText(/合計買い/)).toBeInTheDocument();
  });

  it("shows empty message when snapshot is missing", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: null,
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=allocation",
      },
    );

    await waitFor(() => {
      expect(
        screen.getByText("ポートフォリオ配分の対象となる明細がありません。"),
      ).toBeInTheDocument();
    });
  });
});
