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

  it("renders monthly aggregated bar chart labels", async () => {
    stubTrendsFetch();
    renderWithPortfolioTime(<TrendsDetailPanel />);

    await waitFor(() => {
      expect(
        screen.getAllByText("月次表示（各月の最終基準日）").length,
      ).toBeGreaterThan(0);
      expect(
        document.querySelectorAll(".trend-bar-chart__y-label, .trend-line-chart__y-label").length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText("2026年5月").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2026年6月").length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { name: "総資産" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "損益" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { name: "前回比の変化" }).length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("推移折れ線グラフ").length).toBeGreaterThan(0);
    });
  });

  it("renders daily labels when a calendar month is selected", async () => {
    stubTrendsFetch([trendsPointsFixture[1]]);
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "month=2026-06",
    });

    await waitFor(() => {
      expect(screen.getAllByText("日次表示").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2026/6/7").length).toBeGreaterThan(0);
    });
  });

  it("switches allocation scheme tabs and shows chart tooltip on hover", async () => {
    const user = userEvent.setup();
    stubTrendsFetch();
    const { container } = renderWithPortfolioTime(<TrendsDetailPanel />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "分析軸別構成比" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "資産分類" }));
    expect(screen.getByRole("tab", { name: "資産分類", selected: true })).toBeInTheDocument();

    const hitAreas = within(container).getAllByRole("button", {
      name: /の詳細$/,
    });
    await user.hover(hitAreas[0]);
    expect(container.querySelector(".trend-bar-chart__tooltip")).toBeTruthy();
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

    renderWithPortfolioTime(<TrendsDetailPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("この期間は1か月分のデータです"),
      ).toBeInTheDocument();
    });
  });

  it("shows baseline summary and line charts for a single in-range snapshot", async () => {
    stubTrendsFetch([trendsPointsFixture[0], trendsPointsFixture[1]]);
    renderWithPortfolioTime(<TrendsDetailPanel />, {
      initialSearchParams: "month=2026-06",
    });

    await waitFor(() => {
      expect(
        screen.getByText("この期間は1日分のデータです"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/前回（2026\/05\/31）比 評価額/),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { name: "前回比の変化" }).length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("推移折れ線グラフ").length).toBeGreaterThan(0);
    });
  });
});
