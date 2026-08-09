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
              accountId: "monex:general",
              accountName: "一般口座",
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

  it("aggregates same-name holdings across account types", () => {
    render(
      <AllocationLineBreakdown
        lines={[
          {
            line: {
              id: "line-general",
              instrumentId: "inst-general",
              instrumentName: "共通ファンド",
              accountId: "account-general",
              accountName: "一般口座",
              sortOrder: 0,
              quantity: 10,
              marketValueMinor: 100_000,
              bookValueMinor: 80_000,
              metrics: [],
              instrumentAttributes: [],
              tags: [],
            },
            weightInSlice: 0.6,
            attributedMarketValueMinor: 100_000,
            attributedBookValueMinor: 80_000,
            attributedUnrealizedGainMinor: 20_000,
            attributedUnrealizedGainRate: 0.25,
          },
          {
            line: {
              id: "line-specific",
              instrumentId: "inst-specific",
              instrumentName: "共通ファンド",
              accountId: "account-specific",
              accountName: "特定口座",
              sortOrder: 1,
              quantity: 5,
              marketValueMinor: 50_000,
              bookValueMinor: 40_000,
              metrics: [],
              instrumentAttributes: [],
              tags: [],
            },
            weightInSlice: 0.3,
            attributedMarketValueMinor: 50_000,
            attributedBookValueMinor: 40_000,
            attributedUnrealizedGainMinor: 10_000,
            attributedUnrealizedGainRate: 0.25,
          },
        ]}
      />,
    );

    const row = screen.getByText("共通ファンド").closest("tr");
    expect(screen.getAllByText("共通ファンド")).toHaveLength(1);
    expect(row).toHaveTextContent("15");
    expect(row).toHaveTextContent("￥150,000");
    expect(row).toHaveTextContent("90.00%");
    expect(row).toHaveTextContent("￥30,000");
    expect(row).toHaveTextContent("25.00%");
  });

  it("keeps same-name holdings separate between portfolios", () => {
    const baseLine = sampleAllocationSlices[0]?.lines[0];
    if (!baseLine) {
      throw new Error("allocation fixture is missing");
    }

    render(
      <AllocationLineBreakdown
        lines={[
          {
            ...baseLine,
            portfolioCode: "monex",
            portfolioName: "マネックス証券",
          },
          {
            ...baseLine,
            line: {
              ...baseLine.line,
              id: "line-rakuten",
              accountId: "rakuten:general",
            },
            portfolioCode: "rakuten",
            portfolioName: "楽天証券",
          },
        ]}
        showPortfolioColumn
      />,
    );

    expect(screen.getAllByText("国内ファンド")).toHaveLength(2);
    expect(screen.getByText("マネックス証券")).toBeInTheDocument();
    expect(screen.getByText("楽天証券")).toBeInTheDocument();
  });
});
