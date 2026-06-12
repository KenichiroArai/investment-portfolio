import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AllocationPeriodChangeTable } from "@/features/trends/AllocationPeriodChangeTable";

describe("AllocationPeriodChangeTable", () => {
  afterEach(() => {
    cleanup();
  });

  const rows = [
    {
      key: "domestic",
      label: "国内",
      startRatio: 0.6,
      endRatio: 0.61,
      deltaRatio: 0.01,
      relativeRate: 0.01 / 0.6,
      startMarketValueMinor: 2_000_000,
      endMarketValueMinor: 2_100_000,
      deltaMarketValueMinor: 100_000,
      ratioSeries: [0.6, 0.61],
    },
    {
      key: "foreign",
      label: "海外",
      startRatio: 0.4,
      endRatio: 0.39,
      deltaRatio: -0.01,
      relativeRate: -0.01 / 0.4,
      startMarketValueMinor: 1_400_000,
      endMarketValueMinor: 1_341_347,
      deltaMarketValueMinor: -58_653,
      ratioSeries: [0.4, 0.39],
    },
  ];

  it("renders rows and footnote", () => {
    render(
      <AllocationPeriodChangeTable
        rows={rows}
        selectedKeys={["domestic"]}
        startDateLabel="2026/05/31"
        endDateLabel="2026/06/07"
        onToggleRow={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "期間内の構成変化" })).toBeInTheDocument();
    expect(screen.getByText("国内")).toBeInTheDocument();
    expect(screen.getByText("海外")).toBeInTheDocument();
    expect(
      screen.getByText(/行をクリックすると下の折れ線グラフの表示を切り替えられます/),
    ).toBeInTheDocument();
  });

  it("toggles row selection on click", async () => {
    const user = userEvent.setup();
    const onToggleRow = vi.fn();
    render(
      <AllocationPeriodChangeTable
        rows={rows}
        selectedKeys={[]}
        startDateLabel="2026/05/31"
        endDateLabel="2026/06/07"
        onToggleRow={onToggleRow}
      />,
    );

    await user.click(screen.getByRole("button", { name: "海外 の推移を表示" }));
    expect(onToggleRow).toHaveBeenCalledWith("foreign");
  });

  it("sorts by label when header is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AllocationPeriodChangeTable
        rows={rows}
        selectedKeys={[]}
        startDateLabel="2026/05/31"
        endDateLabel="2026/06/07"
        onToggleRow={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "分類" }));
    const bodyRows = screen.getAllByRole("button", { name: /の推移を/ });
    expect(bodyRows[0]).toHaveAccessibleName("海外 の推移を表示");
  });
});
