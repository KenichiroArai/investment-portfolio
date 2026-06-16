import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisView } from "@/features/analysis/AnalysisView";
import {
  createPortfolioFetchMock,
  renderWithPortfolioTime,
} from "../helpers/portfolio-time-test-utils";

const snapshotFixture = {
  id: "snap-1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [
    { schemeCode: "ideco_region", schemeName: "地域分類" },
    { schemeCode: "ideco_asset_class", schemeName: "資産分類" },
  ],
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
        {
          schemeCode: "ideco_asset_class",
          schemeName: "資産分類",
          valueCode: "equity",
          valueName: "株式",
        },
      ],
    },
  ],
};

describe("AnalysisView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders allocation by active scheme", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );

    await waitFor(() => {
      expect(screen.getByText(/評価額合計/)).toBeInTheDocument();
    });

    expect(screen.getByText(/分類対象額/)).toBeInTheDocument();
    expect(screen.queryByText(/未分類/)).not.toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "地域分類" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "資産分類" })).toBeInTheDocument();
    expect(screen.getAllByText("国内").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    ).toBeInTheDocument();
  });

  it("shows uncovered amount when lines lack tags for the active scheme", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: {
          ...snapshotFixture,
          lines: [
            ...snapshotFixture.lines,
            {
              id: "line-2",
              instrumentId: "inst-2",
              instrumentName: "未分類銘柄",
              sortOrder: 1,
              quantity: 1,
              marketValueMinor: 50_000,
              bookValueMinor: null,
              metrics: [],
              instrumentAttributes: [],
              tags: [],
            },
          ],
        },
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );

    await waitFor(() => {
      expect(screen.getByText(/分類対象額/)).toBeInTheDocument();
    });

    expect(screen.getByText(/資産全体の 66\.67%/)).toBeInTheDocument();
    expect(screen.getByText(/未分類:.*50,000/)).toBeInTheDocument();
  });

  it("switches scheme tabs and expands allocation breakdown", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: snapshotFixture,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "資産分類" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "資産分類" }));
    expect(screen.getByRole("tab", { name: "資産分類" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getAllByText("株式").length).toBeGreaterThanOrEqual(1);

    await user.click(
      screen.getByRole("button", { name: "株式 の内訳を開く" }),
    );
    expect(screen.getByText("テスト銘柄")).toBeInTheDocument();
  });

  it("shows loading skeleton while snapshot loads", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        failFetch: true,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );

    await waitFor(() => {
      expect(screen.getByText(/接続できません/)).toBeInTheDocument();
    });
  });

  it("shows empty message when snapshot is missing", async () => {
    vi.stubGlobal(
      "fetch",
      createPortfolioFetchMock({
        snapshot: null,
      }),
    );

    renderWithPortfolioTime(
      <AnalysisView portfolioCode="ideco" portfolioKind="ideco" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("資産配分の対象となる明細がありません。"),
      ).toBeInTheDocument();
    });
  });
});
