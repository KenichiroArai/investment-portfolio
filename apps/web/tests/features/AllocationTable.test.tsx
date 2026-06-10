import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AllocationTable } from "@/features/analysis/AllocationTable";
import { sampleAllocationSlices } from "./allocation-fixtures";

describe("AllocationTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty message when slices are empty", () => {
    render(
      <AllocationTable
        slices={[]}
        highlightedValueCode={null}
        expandedValueCode={null}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getByText("該当する分類タグがありません。")).toBeInTheDocument();
  });

  it("sorts slices and toggles expand", async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();
    const onSliceHover = vi.fn();
    const onSliceLeave = vi.fn();

    render(
      <AllocationTable
        slices={sampleAllocationSlices}
        highlightedValueCode={null}
        expandedValueCode={null}
        onSliceHover={onSliceHover}
        onSliceLeave={onSliceLeave}
        onToggleExpand={onToggleExpand}
      />,
    );

    const firstSliceName = () =>
      screen.getAllByRole("row")[1]?.textContent ?? "";

    expect(firstSliceName()).toContain("国内");

    await user.click(screen.getByRole("button", { name: "分類" }));
    const afterFirstSort = firstSliceName();
    expect(afterFirstSort).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "分類" }));
    expect(firstSliceName()).not.toBe(afterFirstSort);

    await user.click(
      screen.getByRole("button", { name: "国内 の内訳を開く" }),
    );
    expect(onToggleExpand).toHaveBeenCalledWith("domestic");

    const domesticRow = screen.getByText("国内").closest("tr");
    expect(domesticRow).toBeTruthy();
    if (domesticRow) {
      await user.hover(domesticRow);
      expect(onSliceHover).toHaveBeenCalledWith("domestic");
      await user.unhover(domesticRow);
      expect(onSliceLeave).toHaveBeenCalled();
    }
  });
});
