import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createPortfolioFetchMock, renderWithPortfolioTime } from "../helpers/portfolio-time-test-utils";
import { portfolioTimeNavigationState } from "../helpers/portfolio-time-navigation-state";
import { OverviewTrendChart } from "@/features/trends/OverviewTrendChart";
import { trendsPointsFixture } from "./trends-fixtures";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => portfolioTimeNavigationState.pathname,
  useSearchParams: () => portfolioTimeNavigationState.searchParams,
}));

describe("OverviewTrendChart", () => {
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
          dates: [
            { asOfDate: "2026-05-31", isCurrent: false },
            { asOfDate: "2026-06-07", isCurrent: true },
          ],
        })(url);
      }),
    );
  }

  it("renders delta line chart when multiple buckets exist", async () => {
    stubTrendsFetch();
    renderWithPortfolioTime(<OverviewTrendChart />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "資産推移" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "前回比の変化" })).toBeInTheDocument();
      expect(screen.getByLabelText("推移棒グラフ")).toBeInTheDocument();
      expect(screen.getByLabelText("推移折れ線グラフ")).toBeInTheDocument();
    });
  });

  it("shows chart tooltip on bar hover", async () => {
    const user = userEvent.setup();
    stubTrendsFetch();
    const { container } = renderWithPortfolioTime(<OverviewTrendChart />);

    await waitFor(() => {
      expect(screen.getByLabelText("推移棒グラフ")).toBeInTheDocument();
    });

    const hitArea = within(container).getAllByRole("button", {
      name: /の詳細$/,
    })[0];
    await user.hover(hitArea);
    expect(container.querySelector(".trend-bar-chart__tooltip")).toBeTruthy();
  });

  it("shows empty message when no trend points exist", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        dates: [{ asOfDate: "2026-06-07", isCurrent: true }],
      }),
    );
    renderWithPortfolioTime(<OverviewTrendChart />);

    await waitFor(() => {
      expect(
        screen.getByText(/選択した期間に推移データがありません/),
      ).toBeInTheDocument();
    });
  });
});
