import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PortfolioTimeProvider,
  usePortfolioTime,
} from "@/features/portfolio/PortfolioTimeContext";
import { createPortfolioFetchMock } from "../helpers/portfolio-time-test-utils";
import { trendsPointsFixture } from "./trends-fixtures";

const usePathname = vi.hoisted(() => vi.fn());
const searchParamsRef = vi.hoisted(() => ({
  current: new URLSearchParams() as URLSearchParams,
}));
const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: (url: string) => {
      replace(url);
      const queryIndex = url.indexOf("?");
      searchParamsRef.current = new URLSearchParams(
        queryIndex >= 0 ? url.slice(queryIndex + 1) : "",
      );
    },
    push: vi.fn(),
  }),
  usePathname: () => usePathname(),
  useSearchParams: () => searchParamsRef.current,
}));

function PortfolioTimeConsumer() {
  const {
    availableDates,
    selectedAsOfDate,
    error,
    isHistoricalView,
    loadingDates,
    snapshot,
    trends,
    displayTrendPoints,
    emphasizeAsOf,
    emphasizePeriod,
    trendDisplayUnit,
    setSelectedAsOfDate,
    jumpToLatest,
    setPeriodPreset,
    setTrendBucketPick,
    setTrendDisplayUnit,
  } = usePortfolioTime();

  let result = (
    <div>
      <span data-testid="loading">{String(loadingDates)}</span>
      <span data-testid="dates">{availableDates.join(",")}</span>
      <span data-testid="selected">{selectedAsOfDate ?? ""}</span>
      <span data-testid="error">{error ?? ""}</span>
      <span data-testid="historical">{String(isHistoricalView)}</span>
      <span data-testid="snapshot">{snapshot?.asOfDate ?? ""}</span>
      <span data-testid="trends">{trends?.points.length ?? 0}</span>
      <span data-testid="display-points">
        {displayTrendPoints.map((point) => point.sourceAsOfDate).join(",")}
      </span>
      <span data-testid="trend-display-unit">{trendDisplayUnit}</span>
      <span data-testid="emphasize-as-of">{String(emphasizeAsOf)}</span>
      <span data-testid="emphasize-period">{String(emphasizePeriod)}</span>
      <button type="button" onClick={() => setSelectedAsOfDate("2026-05-31")}>
        過去日を選択
      </button>
      <button type="button" onClick={() => jumpToLatest()}>
        最新へ
      </button>
      <button type="button" onClick={() => setPeriodPreset("1m")}>
        1か月
      </button>
      <button type="button" onClick={() => setPeriodPreset("all")}>
        すべて
      </button>
      <button type="button" onClick={() => setTrendDisplayUnit("day")}>
        1日単位
      </button>
      <button type="button" onClick={() => setTrendBucketPick("first")}>
        期初代表
      </button>
    </div>
  );
  return result;
}

function stubPortfolioFetch(
  options: Parameters<typeof createPortfolioFetchMock>[0] = {},
) {
  const portfolioMock = createPortfolioFetchMock({
    snapshot: {
      id: "s1",
      portfolioCode: "ideco",
      portfolioName: "iDeCo",
      asOfDate: "2026-06-07",
      analysisSchemes: [],
      metrics: [],
      lines: [],
    },
    dates: [
      { asOfDate: "2026-05-31", isCurrent: false },
      { asOfDate: "2026-06-07", isCurrent: true },
    ],
    ...options,
  });

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
      return portfolioMock(url);
    }),
  );
}

describe("PortfolioTimeContext", () => {
  beforeEach(() => {
    searchParamsRef.current = new URLSearchParams();
    usePathname.mockReturnValue("/portfolios/ideco/holdings/");
    replace.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads dates, snapshot, and trends", async () => {
    stubPortfolioFetch();

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dates")).toHaveTextContent("2026-05-31,2026-06-07");
      expect(screen.getByTestId("selected")).toHaveTextContent("2026-06-07");
    });
    await waitFor(() => {
      expect(screen.getByTestId("snapshot")).toHaveTextContent("2026-06-07");
    });
    await waitFor(() => {
      expect(screen.getByTestId("trends")).toHaveTextContent("2");
    });
  });

  it("marks historical view and updates selected date", async () => {
    const user = userEvent.setup();
    stubPortfolioFetch();

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected")).toHaveTextContent("2026-06-07");
    });

    await user.click(screen.getByRole("button", { name: "過去日を選択" }));
    await waitFor(() => {
      expect(screen.getByTestId("selected")).toHaveTextContent("2026-05-31");
    });
    expect(screen.getByTestId("historical")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "最新へ" }));
    await waitFor(() => {
      expect(screen.getByTestId("selected")).toHaveTextContent("2026-06-07");
    });
  });

  it("writes from and to when a period preset is selected", async () => {
    const user = userEvent.setup();
    stubPortfolioFetch();

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dates")).toHaveTextContent("2026-05-31,2026-06-07");
    });

    await user.click(screen.getByRole("button", { name: "1か月" }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("from=2026-05-07"),
      );
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("to=2026-06-07"),
      );
    });
  });

  it("writes unit=day when all preset is selected", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/portfolios/ideco/trends/");
    stubPortfolioFetch({
      dates: [
        { asOfDate: "2026-01-01", isCurrent: false },
        { asOfDate: "2026-03-01", isCurrent: false },
        { asOfDate: "2026-05-31", isCurrent: false },
        { asOfDate: "2026-06-07", isCurrent: true },
      ],
    });

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("dates")).toHaveTextContent(
        "2026-01-01,2026-03-01,2026-05-31,2026-06-07",
      );
    });

    await user.click(screen.getByRole("button", { name: "すべて" }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(expect.stringContaining("unit=day"));
    });
  });

  it("defaults to day display unit for long ranges without explicit unit", async () => {
    usePathname.mockReturnValue("/portfolios/ideco/trends/");
    searchParamsRef.current = new URLSearchParams(
      "from=2026-01-01&to=2026-06-07",
    );
    stubPortfolioFetch({
      dates: [
        { asOfDate: "2026-01-01", isCurrent: false },
        { asOfDate: "2026-03-01", isCurrent: false },
        { asOfDate: "2026-05-31", isCurrent: false },
        { asOfDate: "2026-06-07", isCurrent: true },
      ],
    });

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("trend-display-unit")).toHaveTextContent("day");
    });
  });

  it("shows error when dates fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("snapshots-index") || url.endsWith("/snapshots")) {
          return {
            ok: false,
            status: 500,
            json: async () => ({}),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      }),
    );

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "基準日一覧の取得に失敗しました。",
      );
    });
  });

  it("applies bucket pick to display trend points", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/portfolios/ideco/trends/");
    searchParamsRef.current = new URLSearchParams("unit=week");
    stubPortfolioFetch();

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("display-points")).toHaveTextContent("2026-06-07");
    });

    await user.click(screen.getByRole("button", { name: "期初代表" }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(expect.stringContaining("pick=first"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("display-points")).toHaveTextContent("2026-05-31");
    });
  });

  it("skips loading on settings route", async () => {
    usePathname.mockReturnValue("/portfolios/ideco/settings/data/");
    stubPortfolioFetch();

    render(
      <PortfolioTimeProvider portfolioCode="ideco">
        <PortfolioTimeConsumer />
      </PortfolioTimeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("dates")).toHaveTextContent("");
    expect(screen.getByTestId("selected")).toHaveTextContent("");
  });

  it.each([
    {
      pathname: "/portfolios/ideco",
      searchParams: "",
      emphasizeAsOf: "true",
      emphasizePeriod: "true",
    },
    {
      pathname: "/portfolios/ideco/portfolio-allocation",
      searchParams: "view=composition",
      emphasizeAsOf: "true",
      emphasizePeriod: "true",
    },
    {
      pathname: "/portfolios/ideco/portfolio-allocation",
      searchParams: "panel=trends",
      emphasizeAsOf: "true",
      emphasizePeriod: "true",
    },
    {
      pathname: "/portfolios/ideco/analysis",
      searchParams: "",
      emphasizeAsOf: "true",
      emphasizePeriod: "true",
    },
    {
      pathname: "/portfolios/ideco/analysis",
      searchParams: "view=trends",
      emphasizeAsOf: "true",
      emphasizePeriod: "true",
    },
    {
      pathname: "/portfolios/ideco/trends",
      searchParams: "",
      emphasizeAsOf: "false",
      emphasizePeriod: "true",
    },
    {
      pathname: "/portfolios/ideco/holdings",
      searchParams: "",
      emphasizeAsOf: "true",
      emphasizePeriod: "true",
    },
  ])(
    "sets emphasize flags for $pathname with $searchParams",
    async ({ pathname, searchParams, emphasizeAsOf, emphasizePeriod }) => {
      usePathname.mockReturnValue(pathname);
      searchParamsRef.current = new URLSearchParams(searchParams);
      stubPortfolioFetch();

      render(
        <PortfolioTimeProvider portfolioCode="ideco">
          <PortfolioTimeConsumer />
        </PortfolioTimeProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("emphasize-as-of")).toHaveTextContent(emphasizeAsOf);
        expect(screen.getByTestId("emphasize-period")).toHaveTextContent(emphasizePeriod);
      });
    },
  );
});
