import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";
import { portfolioTimeNavigationState } from "../helpers/portfolio-time-navigation-state";
import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { snapshotWithSchemesFixture, trendsPointsFixture } from "./trends-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => portfolioTimeNavigationState.pathname,
  useSearchParams: () => portfolioTimeNavigationState.searchParams,
}));

describe("TrendsDetailPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function stubTrendsFetch(points = trendsPointsFixture) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("trends")) {
          const fromMatch = /from=([^&]+)/.exec(url);
          const toMatch = /to=([^&]+)/.exec(url);
          const from = fromMatch?.[1] ?? "2026-05-31";
          const to = toMatch?.[1] ?? "2026-06-07";
          const filtered = points.filter(
            (point) => point.asOfDate >= from && point.asOfDate <= to,
          );
          return {
            ok: true,
            status: 200,
            json: async () => ({
              portfolioCode: "ideco",
              from,
              to,
              points: filtered,
            }),
          };
        }
        return createPortfolioFetchMock({
          snapshot: snapshotWithSchemesFixture,
          dates: [
            { asOfDate: "2026-05-31", isCurrent: false },
            { asOfDate: "2026-06-07", isCurrent: true },
          ],
        })(url);
      }),
    );
  }

  it("renders allocation hero charts and period summary", async () => {
    stubTrendsFetch();
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "from=2026-05-01&to=2026-07-31&unit=1m",
    });

    await waitFor(() => {
      expect(screen.getByText("期首（2026/05/31）")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "構成比の推移" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "期間内の構成変化" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "構成ごとの構成比推移" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "構成比", selected: true })).toBeInTheDocument();
      expect(screen.getByLabelText("構成比積み上げエリアグラフ")).toBeInTheDocument();
      expect(screen.getAllByText("1か月単位").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2026/5/1～6/1").length).toBeGreaterThan(0);
    });
  });

  it("renders daily labels when a calendar month is selected", async () => {
    stubTrendsFetch([trendsPointsFixture[1]]);
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "month=2026-06&unit=day",
    });

    await waitFor(() => {
      expect(screen.getAllByText("1日単位").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2026/6/7").length).toBeGreaterThan(0);
    });
  });

  it("toggles composition selection from table row click", async () => {
    const user = userEvent.setup();
    stubTrendsFetch();
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "from=2026-05-01&to=2026-07-31&unit=1m",
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "期間内の構成変化" })).toBeInTheDocument();
    });

    const rowButton = screen.getByRole("button", { name: "海外 の推移を非表示" });
    await user.click(rowButton);
    expect(screen.getByRole("button", { name: "海外 の推移を表示" })).toBeInTheDocument();
  });

  it("switches allocation scheme tabs and shows chart tooltip on hover", async () => {
    const user = userEvent.setup();
    stubTrendsFetch();
    const { container } = renderWithPortfolioTime(<TrendsDetailPanel />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "構成比の推移" })).toBeInTheDocument();
    });

    const analysisAxisTabs = within(
      screen.getByRole("tablist", { name: "構成比の分析軸" }),
    );
    await user.click(analysisAxisTabs.getByRole("tab", { name: "資産分類" }));
    expect(analysisAxisTabs.getByRole("tab", { name: "資産分類", selected: true })).toBeInTheDocument();

    const hitAreas = within(container).getAllByRole("button", {
      name: /の詳細$/,
    });
    await user.hover(hitAreas[0]);
    expect(container.querySelector(".trend-stacked-area-chart__tooltip")).toBeTruthy();
  });

  it("shows empty message when trends have no points", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotWithSchemesFixture,
        dates: [{ asOfDate: "2026-06-07", isCurrent: true }],
      }),
    );
    renderWithPortfolioTime(<TrendsDetailPanel />);

    await waitFor(() => {
      expect(
        screen.getByText(/選択した期間に推移データがありません/),
      ).toBeInTheDocument();
    });
  });

  it("shows single-bucket note when only one month exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("trends")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              portfolioCode: "ideco",
              from: "2026-06-07",
              to: "2026-06-07",
              points: [trendsPointsFixture[1]],
            }),
          };
        }
        return createPortfolioFetchMock({
          snapshot: snapshotWithSchemesFixture,
          dates: [{ asOfDate: "2026-06-07", isCurrent: true }],
        })(url);
      }),
    );

    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "unit=1m",
    });

    await waitFor(() => {
      expect(
        screen.getByText("この期間は1か月分のデータです"),
      ).toBeInTheDocument();
    });
  });

  it("shows sparse data note when snapshots start after the selected range", async () => {
    stubTrendsFetch([
      {
        ...trendsPointsFixture[1],
        asOfDate: "2026-06-02",
      },
      trendsPointsFixture[1],
    ]);
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "from=2026-03-11&to=2026-06-11&unit=3m",
    });

    await waitFor(() => {
      expect(
        screen.getByText("選択期間のうち 2026/6/2 以降にデータがあります"),
      ).toBeInTheDocument();
      expect(screen.getAllByText("2026/3/11～6/11").length).toBeGreaterThan(0);
    });
  });

  it("shows baseline summary for a single in-range snapshot", async () => {
    stubTrendsFetch([trendsPointsFixture[0], trendsPointsFixture[1]]);
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "month=2026-06&unit=day",
    });

    await waitFor(() => {
      expect(
        screen.getByText("この期間は1日分のデータです"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/前回（2026\/05\/31）比 評価額/),
      ).toBeInTheDocument();
    });
  });

  it("switches metric tabs and sub-tabs", async () => {
    const user = userEvent.setup();
    stubTrendsFetch();
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "from=2026-05-01&to=2026-07-31&unit=1m",
    });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "構成比", selected: true })).toBeInTheDocument();
    });

    const metricTabs = within(screen.getByRole("tablist", { name: "指標" }));
    await user.click(metricTabs.getByRole("tab", { name: "評価額" }));
    expect(screen.getByRole("heading", { name: "評価額" })).toBeInTheDocument();

    const marketValueViews = within(
      screen.getByRole("tablist", { name: "評価額の表示" }),
    );

    await user.click(marketValueViews.getByRole("tab", { name: "増減" }));
    expect(screen.getByRole("heading", { name: "評価額の増減" })).toBeInTheDocument();

    await user.click(metricTabs.getByRole("tab", { name: "損益" }));
    expect(screen.getByRole("heading", { name: "評価損益の増減" })).toBeInTheDocument();

    await user.click(metricTabs.getByRole("tab", { name: "利益率" }));
    expect(screen.getByRole("heading", { name: "利益率の推移" })).toBeInTheDocument();

    const gainRateViews = within(screen.getByRole("tablist", { name: "利益率の表示" }));
    await user.click(gainRateViews.getByRole("tab", { name: "拠出金ベース" }));
    expect(gainRateViews.getByRole("tab", { name: "拠出金ベース", selected: true })).toBeInTheDocument();
  });
});
