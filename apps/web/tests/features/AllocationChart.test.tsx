import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AllocationChart } from "@/features/analysis/AllocationChart";
import { sampleAllocationSlices } from "./allocation-fixtures";

describe("AllocationChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty chart when slices are empty", () => {
    const { container } = render(
      <AllocationChart
        slices={[]}
        highlightedValueCode={null}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "資産配分の円グラフ" })).toBeInTheDocument();
    expect(container.querySelector(".allocation-chart__empty")).toBeTruthy();
  });

  it("renders legend and donut slices", () => {
    render(
      <AllocationChart
        slices={sampleAllocationSlices}
        highlightedValueCode={null}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
      />,
    );

    expect(screen.getByText("国内")).toBeInTheDocument();
    expect(screen.getByText("海外")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("calls hover handlers from slice path and legend", async () => {
    const user = userEvent.setup();
    const onSliceHover = vi.fn();
    const onSliceLeave = vi.fn();

    const { container } = render(
      <AllocationChart
        slices={sampleAllocationSlices}
        highlightedValueCode={null}
        onSliceHover={onSliceHover}
        onSliceLeave={onSliceLeave}
      />,
    );

    const slicePath = container.querySelector(".allocation-chart__slice");
    expect(slicePath).toBeTruthy();
    if (slicePath) {
      await user.hover(slicePath);
      expect(onSliceHover).toHaveBeenCalledWith(
        "domestic",
        expect.any(Number),
        expect.any(Number),
      );
      await user.unhover(slicePath);
      expect(onSliceLeave).toHaveBeenCalled();
    }

    onSliceHover.mockClear();
    onSliceLeave.mockClear();

    const legend = screen.getByText("海外").closest("li");
    expect(legend).toBeTruthy();
    if (legend) {
      await user.hover(legend);
      expect(onSliceHover).toHaveBeenCalledWith(
        "foreign",
        expect.any(Number),
        expect.any(Number),
      );
      legend.focus();
      expect(onSliceHover).toHaveBeenCalledWith(
        "foreign",
        expect.any(Number),
        expect.any(Number),
      );
      legend.blur();
      expect(onSliceLeave).toHaveBeenCalled();
    }
  });

  it("dims non-highlighted legend items", () => {
    const { container } = render(
      <AllocationChart
        slices={sampleAllocationSlices}
        highlightedValueCode="domestic"
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
      />,
    );

    const legend = within(container).getByText("海外").closest("li");
    expect(legend).toHaveClass("allocation-chart__legend-item--dimmed");
    expect(
      container.querySelector(".allocation-chart__slice--dimmed"),
    ).toBeTruthy();
  });
});
