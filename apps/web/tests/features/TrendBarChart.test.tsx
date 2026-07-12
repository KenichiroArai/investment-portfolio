import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows tooltip on hover with full yen values", async () => {
    const user = userEvent.setup();
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
    await user.hover(hitAreas[0]);
    const tooltipRow = container.querySelector(".trend-bar-chart__tooltip-row");
    expect(tooltipRow?.textContent).toContain(formatYen(3_441_347));
    expect(container.querySelector(".trend-bar-chart__tooltip-date")).toBeTruthy();
  });

  it("shows tooltip on focus for stacked bars", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrendBarChart
        labels={["2026年6月"]}
        sourceDates={["2026-06-07"]}
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

    const hitArea = within(container).getByRole("button", {
      name: "2026年6月 の詳細",
    });
    await user.click(hitArea);
    expect(container.querySelector(".trend-bar-chart__tooltip")).toBeTruthy();
    expect(screen.getByText("株式")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    render(<TrendBarChart labels={[]} series={[]} />);
    expect(screen.getByText("表示できるデータがありません。")).toBeInTheDocument();
  });

  it("anchors grouped negative bars to the zero baseline", () => {
    const { container } = render(
      <TrendBarChart
        labels={["6/9", "6/10"]}
        height={180}
        formatYAxis={(value) => `${value}`}
        series={[
          {
            key: "gain-delta",
            label: "評価損益の変化",
            color: "#16a34a",
            values: [-75_000, 5_000],
          },
        ]}
      />,
    );

    const zeroY = container
      .querySelector(".trend-bar-chart__axis")
      ?.getAttribute("y1");
    const bars = container.querySelectorAll(".trend-bar-chart__bar");
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute("y")).toBe(zeroY);

    const positiveBarY = Number(bars[1].getAttribute("y"));
    const positiveBarHeight = Number(bars[1].getAttribute("height"));
    expect(positiveBarY + positiveBarHeight).toBeCloseTo(Number(zeroY), 0);
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
    expect(axisLabels).toEqual(["0.00%", "25.00%", "50.00%", "75.00%", "100.00%"]);
    expect(container.querySelector(".trend-chart__y-unit")).toBeNull();
  });

  it("truncates long x-axis instrument labels while keeping full name in tooltip", async () => {
    const user = userEvent.setup();
    const fullLabel = "三菱ＵＦＪ 純金ファンド（愛称：純金積立）";
    const { container } = render(
      <TrendBarChart
        labels={[fullLabel, "SBI・V・全世界株式インデックス・ファンド"]}
        valueKind="yen"
        series={[
          {
            key: "market-value",
            label: "評価額",
            color: "#2563eb",
            values: [900_000, 700_000],
          },
        ]}
      />,
    );

    const xLabels = Array.from(
      container.querySelectorAll(".trend-bar-chart__x-label"),
    ).map((node) => node.textContent);
    expect(xLabels[0]).not.toBe(fullLabel);
    expect(xLabels[0]?.endsWith("…")).toBe(true);

    const hitArea = within(container).getByRole("button", {
      name: `${fullLabel} の詳細`,
    });
    await user.hover(hitArea);
    expect(container.querySelector(".trend-bar-chart__tooltip-title")?.textContent).toBe(
      fullLabel,
    );
  });
});
