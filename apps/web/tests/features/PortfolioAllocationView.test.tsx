import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PortfolioAllocationView } from "@/features/portfolio-allocation/PortfolioAllocationView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";
import { portfolioTimeNavigationState } from "../helpers/portfolio-time-navigation-state";
import { trendsPointsFixture } from "./trends-fixtures";

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

  it("renders composition tab without rebalance or analysis axis", async () => {
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
        initialSearchParams: "view=composition",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("銘柄別構成比")).toBeInTheDocument();
    });

    expect(screen.getByText("最大乖離銘柄")).toBeInTheDocument();
    expect(screen.getAllByText("100.0%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("columnheader", { name: "乖離率" })).toBeInTheDocument();
    expect(screen.queryByText("1 / 1 銘柄")).not.toBeInTheDocument();
    expect(screen.queryByText("銘柄目標配分")).not.toBeInTheDocument();
    expect(screen.queryByText("リバランス設定")).not.toBeInTheDocument();
    expect(screen.queryByText("売買提案")).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "分析軸" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "資産配分目標" }),
    ).not.toBeInTheDocument();
  });

  it("maps legacy view=allocation to composition tab", async () => {
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

    expect(screen.getByRole("tab", { name: "構成比", selected: true })).toBeInTheDocument();
    expect(screen.queryByText("リバランス設定")).not.toBeInTheDocument();
  });

  it("renders rebalance tab with target settings and trades summary", async () => {
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
        initialSearchParams: "view=rebalance",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("銘柄目標配分")).toBeInTheDocument();
    });

    expect(screen.getByText("1 / 1 銘柄")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "現状（%）" })).toBeInTheDocument();
    expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getAllByText(/合計買い/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("銘柄別構成比")).not.toBeInTheDocument();
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
        initialSearchParams: "view=rebalance",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("リバランス設定")).toBeInTheDocument();
    });

    expect(screen.queryByText("銘柄目標配分")).not.toBeInTheDocument();
    expect(screen.getByText("売買提案")).toBeInTheDocument();
    expect(screen.getAllByText(/合計買い/).length).toBeGreaterThanOrEqual(1);
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

  it("renders prominent four-tab controls in order with holdings selected by default", async () => {
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
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("tablist", { name: "ポートフォリオ配分の表示" })).toBeInTheDocument();
      expect(screen.getByText("資産残高")).toBeInTheDocument();
    });

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["明細", "構成比", "推移", "リバランス"]);

    const activeTab = screen.getByRole("tab", { name: "明細" });
    expect(activeTab.className).toContain("data-[state=active]:bg-primary");
  });

  it("renders instrument composition trends on the trends tab", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
        targetPortfolioWeights: [{ instrumentId: "inst-1", targetRatio: 0.5 }],
        dates: [
          { asOfDate: "2026-05-31", isCurrent: false },
          { asOfDate: "2026-06-07", isCurrent: true },
        ],
        trendsPoints: trendsPointsFixture,
      }),
    );

    renderWithPortfolioTime(
      <PortfolioAllocationView portfolioCode="ideco" portfolioKind="ideco" />,
      {
        pathname: "/portfolios/ideco/portfolio-allocation",
        initialSearchParams: "view=trends&from=2026-05-01&to=2026-07-31&unit=1m",
      },
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "銘柄全体の変化" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "構成比", selected: true })).toBeInTheDocument();
    });
  });
});
