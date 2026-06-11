import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { TrendLineChart } from "@/features/trends/TrendLineChart";
import { formatPercent, formatPercentDeltaTooltip, formatYen } from "@/lib/format-yen";

describe("TrendLineChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders y-axis labels and line chart", () => {
    const { container } = render(
      <TrendLineChart
        labels={["2026年6月", "2026年7月"]}
        sourceDates={["2026-06-07", "2026-07-01"]}
        valueKind="yen"
        series={[
          {
            key: "market-value-delta",
            label: "評価額の変化",
            color: "#2563eb",
            values: [null, 50_000],
            formatValue: (value) => `${value}円`,
          },
        ]}
      />,
    );

    expect(screen.getByText("0円")).toBeInTheDocument();
    expect(screen.getByText("50,000円")).toBeInTheDocument();
    expect(container.querySelector(".trend-chart__y-unit")).toBeNull();
    expect(screen.getByText("2026年6月")).toBeInTheDocument();
    expect(screen.getByText("2026年7月")).toBeInTheDocument();
    expect(screen.getByLabelText("推移折れ線グラフ")).toBeInTheDocument();
  });

  it("shows tooltip on hover with formatted values", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrendLineChart
        labels={["2026年6月", "2026年7月"]}
        sourceDates={["2026-06-07", "2026-07-01"]}
        valueKind="yen"
        series={[
          {
            key: "market-value-delta",
            label: "評価額の変化",
            color: "#2563eb",
            values: [null, 441_347],
            formatValue: (value) => formatYen(value),
          },
        ]}
      />,
    );

    const hitAreas = within(container).getAllByRole("button", {
      name: /の詳細$/,
    });
    await user.hover(hitAreas[1]);
    const tooltipRow = container.querySelector(".trend-line-chart__tooltip-row");
    expect(tooltipRow?.textContent).toContain(formatYen(441_347));
  });

  it("shows tooltip on focus via keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrendLineChart
        labels={["2026年6月", "2026年7月"]}
        valueKind="percent"
        domainMode="fitData"
        series={[
          {
            key: "domestic",
            label: "国内株式",
            color: "#2563eb",
            values: [0.4, 0.45],
            formatValue: (value) => formatPercent(value),
          },
        ]}
      />,
    );

    const hitArea = within(container).getByRole("button", {
      name: "2026年7月 の詳細",
    });
    await user.click(hitArea);
    expect(container.querySelector(".trend-line-chart__tooltip")).toBeTruthy();
    await user.unhover(hitArea);
    expect(container.querySelector(".trend-line-chart__tooltip")).toBeNull();
  });

  it("renders empty state when no data", () => {
    render(<TrendLineChart labels={[]} series={[]} />);
    expect(screen.getByText("表示できるデータがありません。")).toBeInTheDocument();
  });

  it("renders multiple series with percent formatting", () => {
    const { container } = render(
      <TrendLineChart
        labels={["2026年6月", "2026年7月"]}
        valueKind="percent"
        domainMode="fitData"
        series={[
          {
            key: "domestic",
            label: "国内株式",
            color: "#2563eb",
            values: [0.4, 0.45],
            formatValue: (value) => formatPercent(value),
          },
          {
            key: "foreign",
            label: "外国株式",
            color: "#16a34a",
            values: [0.3, 0.25],
            formatValue: (value) => formatPercent(value),
          },
        ]}
      />,
    );

    expect(screen.getByText("国内株式")).toBeInTheDocument();
    expect(screen.getByText("外国株式")).toBeInTheDocument();
    expect(container.querySelector(".trend-chart__y-unit")).toBeNull();
  });

  it("shows percent delta tooltip with level transition and relative change", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrendLineChart
        labels={["2026年6月", "2026年7月"]}
        valueKind="percentPoint"
        domainMode="fitData"
        series={[
          {
            key: "domestic",
            label: "国内株式",
            color: "#2563eb",
            levelValues: [0.288, 0.291],
            values: [null, 0.003],
            tooltipMode: "percentDelta",
          },
        ]}
      />,
    );

    const hitAreas = within(container).getAllByRole("button", {
      name: /の詳細$/,
    });
    await user.hover(hitAreas[1]);
    const tooltipRow = container.querySelector(".trend-line-chart__tooltip-row");
    expect(tooltipRow?.textContent).toContain(
      formatPercentDeltaTooltip(0.288, 0.291),
    );
  });
});
