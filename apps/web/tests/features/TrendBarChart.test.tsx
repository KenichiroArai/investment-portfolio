import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TrendBarChart } from "@/features/trends/TrendBarChart";
import { formatPercent, formatYen, formatYenManAxis } from "@/lib/format-yen";

describe("TrendBarChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders y-axis labels and grouped bars", () => {
    render(
      <TrendBarChart
        labels={["2026年6月", "2026年7月"]}
        sourceDates={["2026-06-07", "2026-07-01"]}
        formatYAxis={(value) => `${value}円`}
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: [1000000, 1100000],
            formatValue: (value) => `${value}円`,
          },
        ]}
      />,
    );

    expect(screen.getByText("0円")).toBeInTheDocument();
    expect(screen.getByText("2026年6月")).toBeInTheDocument();
    expect(screen.getByText("2026年7月")).toBeInTheDocument();
    expect(screen.getByLabelText("推移棒グラフ")).toBeInTheDocument();
  });

  it("shows tooltip on hover with full yen values", () => {
    const { container } = render(
      <TrendBarChart
        labels={["2026年6月"]}
        sourceDates={["2026-06-07"]}
        formatYAxis={formatYenManAxis}
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: [3_441_347],
            formatValue: (value) => formatYen(value),
          },
        ]}
      />,
    );

    const hitAreas = within(container).getAllByRole("button", {
      name: "2026年6月 の詳細",
    });
    fireEvent.mouseEnter(hitAreas[0]);
    const tooltipRow = container.querySelector(".trend-bar-chart__tooltip-row");
    expect(tooltipRow?.textContent).toContain(formatYen(3_441_347));
  });

  it("renders empty state when no data", () => {
    render(<TrendBarChart labels={[]} series={[]} />);
    expect(screen.getByText("表示できるデータがありません。")).toBeInTheDocument();
  });

  it("uses nice yen axis ticks for grouped bars", () => {
    const { container } = render(
      <TrendBarChart
        labels={["2026年6月"]}
        formatYAxis={formatYenManAxis}
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: [3_441_347],
          },
        ]}
      />,
    );

    const axisLabels = Array.from(
      container.querySelectorAll(".trend-bar-chart__y-label"),
    ).map((node) => node.textContent);
    expect(axisLabels).toEqual(["0", "100", "200", "300", "400"]);
  });

  it("shows yen unit on each y-axis tick", () => {
    const { container } = render(
      <TrendBarChart
        labels={["2026年6月"]}
        valueKind="yen"
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: [3_441_347],
          },
        ]}
      />,
    );

    const axisLabels = Array.from(
      container.querySelectorAll(".trend-bar-chart__y-label"),
    ).map((node) => node.textContent);
    expect(axisLabels.every((label) => label?.endsWith("万円"))).toBe(true);
    expect(container.querySelector(".trend-chart__y-unit")).toBeNull();
  });

  it("uses 25% axis ticks for stacked ratio charts", () => {
    const { container } = render(
      <TrendBarChart
        labels={["2026年6月"]}
        mode="stacked"
        valueDomain={{ min: 0, max: 1 }}
        valueKind="percent"
        series={[
          {
            key: "equity",
            label: "株式",
            color: "#2563eb",
            values: [0.6],
          },
          {
            key: "bond",
            label: "債券",
            color: "#16a34a",
            values: [0.4],
          },
        ]}
      />,
    );

    const axisLabels = Array.from(
      container.querySelectorAll(".trend-bar-chart__y-label"),
    ).map((node) => node.textContent);
    expect(axisLabels).toEqual(["0.00%", "25%", "50%", "75%", "100%"]);
    expect(container.querySelector(".trend-chart__y-unit")).toBeNull();
  });
});
