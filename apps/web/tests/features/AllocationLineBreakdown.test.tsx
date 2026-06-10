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
