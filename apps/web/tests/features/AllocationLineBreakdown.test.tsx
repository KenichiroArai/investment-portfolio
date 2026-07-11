import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AllocationLineBreakdown } from "@/features/analysis/AllocationLineBreakdown";
import { sampleAllocationSlices } from "./allocation-fixtures";

describe("AllocationLineBreakdown", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders holding line detail rows", () => {
    render(
      <AllocationLineBreakdown
        lines={sampleAllocationSlices[0]?.lines ?? []}
      />,
    );

    expect(screen.getByText("国内ファンド")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "分類内構成比" })).toBeInTheDocument();
  });

  it("renders attributed market value for multi-tag holdings", () => {
    render(
      <AllocationLineBreakdown
        lines={[
          {
            line: {
              id: "line-msv",
              instrumentId: "inst-msv",
              instrumentName: "MSV内外ETF 資産配分F・G",
              sortOrder: 0,
              quantity: 3431,
              marketValueMinor: 10_052,
              bookValueMinor: 10_000,
              metrics: [
                {
                  code: "unrealized_gain_minor",
                  integerValue: 52,
                  realValue: null,
                  textValue: null,
                },
              ],
              instrumentAttributes: [],
              tags: [],
            },
            weightInSlice: 0.1281,
            attributedMarketValueMinor: 1_289,
            attributedBookValueMinor: 1_282,
            attributedUnrealizedGainMinor: 7,
            attributedUnrealizedGainRate: 0.00546,
          },
        ]}
        portfolioKind="monex"
      />,
    );

    expect(screen.getByText("￥1,289")).toBeInTheDocument();
    expect(screen.queryByText("￥10,052")).not.toBeInTheDocument();
    expect(screen.getByText("￥7")).toBeInTheDocument();
  });

  it("renders portfolio column when enabled", () => {
    render(
      <AllocationLineBreakdown
        lines={sampleAllocationSlices[1]?.lines ?? []}
        showPortfolioColumn
        className="custom-breakdown"
      />,
    );

    expect(screen.getByRole("columnheader", { name: "口座" })).toBeInTheDocument();
    expect(screen.getByText("iDeCo")).toBeInTheDocument();
    expect(document.querySelector(".custom-breakdown")).toBeTruthy();
  });
});
