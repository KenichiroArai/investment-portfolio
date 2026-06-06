import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalysisView } from "@/features/analysis/AnalysisView";

const snapshotFixture = {
  id: "snap-1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-01",
  analysisSchemes: [
    { schemeCode: "ideco_region", schemeName: "地域分類" },
    { schemeCode: "ideco_asset_class", schemeName: "資産分類" },
  ],
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
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => snapshotFixture,
      }),
    );

    render(<AnalysisView portfolioCode="ideco" portfolioKind="ideco" />);

    await waitFor(() => {
      expect(screen.getByText(/評価額合計/)).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "地域分類" })).toBeInTheDocument();
    expect(screen.getAllByText("国内").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "資産分類" }));
    expect(screen.getByRole("heading", { name: "資産分類" })).toBeInTheDocument();
    expect(screen.getAllByText("株式").length).toBeGreaterThanOrEqual(1);
  });
});
