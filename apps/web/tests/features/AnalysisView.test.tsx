import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
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

    expect(screen.getByRole("heading", { name: "地域分類" })).toBeInTheDocument();
    expect(screen.getAllByText("国内").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "資産分類" }));
    expect(screen.getByRole("heading", { name: "資産分類" })).toBeInTheDocument();
    expect(screen.getAllByText("株式").length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getByText(/資産全体の 66\.7%/)).toBeInTheDocument();
    expect(screen.getByText(/未分類:.*50,000/)).toBeInTheDocument();
  });
});
