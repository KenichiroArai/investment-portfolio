import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { AllocationPanel } from "@/features/analysis/AllocationPanel";
import { sampleAllocationSlices } from "./allocation-fixtures";

describe("AllocationPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows tooltip on chart hover and expands table rows", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AllocationPanel slices={sampleAllocationSlices} />,
    );

    const legendItem = screen
      .getByRole("img", { name: "資産配分の円グラフ" })
      .parentElement?.querySelector(".allocation-chart__legend li");
    expect(legendItem).toBeTruthy();
    if (legendItem) {
      await user.hover(legendItem);
      expect(screen.getByRole("tooltip")).toHaveTextContent("国内");
      expect(screen.getByRole("tooltip")).toHaveTextContent("評価額:");
      expect(screen.getByRole("tooltip")).toHaveTextContent("構成比:");
    }

    await user.click(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    );
    expect(
      screen.getByRole("button", { name: "国内 の内訳を閉じる" }),
    ).toBeInTheDocument();
    expect(screen.getByText("国内ファンド")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "国内 の内訳を閉じる" }),
    );
    expect(screen.queryByText("国内ファンド")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    );
    await user.click(
      screen.getByRole("button", { name: "海外 の内訳を開く" }),
    );
    expect(screen.getByText("国内ファンド")).toBeInTheDocument();
    expect(screen.getByText("海外ファンド")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "国内 の内訳を閉じる" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "海外 の内訳を閉じる" }),
    ).toBeInTheDocument();

    const foreignRow = Array.from(
      document.querySelectorAll(".allocation-table tbody tr"),
    ).find((row) => row.textContent?.includes("海外"));
    expect(foreignRow).toBeTruthy();
    if (foreignRow) {
      await user.hover(foreignRow);
      expect(container.querySelector(".allocation-table__row--highlight")).toBeTruthy();
    }
  });

  it("renders portfolio column in breakdown when enabled", async () => {
    const user = userEvent.setup();
    render(
      <AllocationPanel
        slices={sampleAllocationSlices}
        showPortfolioColumn
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "海外 の内訳を開く" }),
    );
    expect(screen.getByRole("columnheader", { name: "口座" })).toBeInTheDocument();
    expect(screen.getByText("iDeCo")).toBeInTheDocument();
  });
});
