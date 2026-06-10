import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HoldingsView } from "@/features/portfolio/HoldingsView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";

describe("HoldingsView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows loading state initially", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = renderWithPortfolioTime(
      <HoldingsView portfolioCode="ideco" />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows API connection error when fetch fails", async () => {
    vi.stubGlobal("fetch", createPortfolioFetchMock({ failFetch: true }));
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/API に接続できません/)).toBeInTheDocument();
    });
  });

  it("shows static load error when fetch fails in static mode", async () => {
    const prev = process.env.NEXT_PUBLIC_DATA_SOURCE;
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    vi.stubGlobal("fetch", createPortfolioFetchMock({ failFetch: true }));
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/pages:export/)).toBeInTheDocument();
    });
    if (prev === undefined) {
      delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    } else {
      process.env.NEXT_PUBLIC_DATA_SOURCE = prev;
    }
  });

  it("renders snapshot table", async () => {
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
          lines: [
            {
              id: "l1",
              instrumentId: "i1",
              instrumentName: "テストファンド",
              quantity: 10,
              marketValueMinor: 10000,
              bookValueMinor: null,
              metrics: [],
              instrumentAttributes: [],
              tags: [
                {
                  schemeCode: "region",
                  schemeName: "地域",
                  valueCode: "japan",
                  valueName: "日本",
                },
              ],
            },
          ],
        },
      }),
    );
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("テストファンド")).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "資産残高" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "購入金額" })).toBeInTheDocument();
      expect(screen.getByRole("columnheader", { name: "地域" })).toBeInTheDocument();
      expect(screen.getByText("日本")).toBeInTheDocument();
    });
  });

  it("shows fetch error when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshotStatus: 500,
      }),
    );
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/データの取得に失敗しました/)).toBeInTheDocument();
    });
  });

  it("shows messages for 404 and lines without metrics", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        datesStatus: 404,
        snapshot: null,
      }),
    );
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/明細がまだ登録されていません/)).toBeInTheDocument();
    });

    cleanup();

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
          lines: [
            {
              id: "l1",
              instrumentId: "i1",
              instrumentName: "無タグ",
              quantity: 1,
              marketValueMinor: 100,
              bookValueMinor: null,
              metrics: [],
              instrumentAttributes: [],
              tags: [],
            },
          ],
        },
      }),
    );
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText("無タグ")).toBeInTheDocument();
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("ignores fetch result after unmount", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const { unmount } = renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    unmount();
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        portfolioCode: "ideco",
        dates: [{ asOfDate: "2026-06-01", isCurrent: true }],
      }),
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(/保有銘柄がありません/)).not.toBeInTheDocument();
  });

  it("shows empty holdings message", async () => {
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
    renderWithPortfolioTime(<HoldingsView portfolioCode="ideco" />);
    await waitFor(() => {
      expect(screen.getByText(/保有銘柄がありません/)).toBeInTheDocument();
    });
  });
});
