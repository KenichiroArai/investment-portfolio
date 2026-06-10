import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrendsDetailPanel } from "@/features/trends/TrendsDetailPanel";
import { createPortfolioFetchMock, renderWithPortfolioTime } from "../helpers/portfolio-time-test-utils";
import { snapshotWithSchemesFixture, trendsPointsFixture } from "./trends-fixtures";

describe("TrendsDetailPanel", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function stubTrendsFetch() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("trends")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              portfolioCode: "ideco",
              from: "2026-05-31",
              to: "2026-06-07",
              points: trendsPointsFixture,
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
});
