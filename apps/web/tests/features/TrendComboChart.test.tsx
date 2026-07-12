import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { TrendComboChart } from "@/features/trends/TrendComboChart";
import { formatPercent, formatYen } from "@/lib/format-yen";

describe("TrendComboChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders stacked bars and lines with unitless axes", () => {
    const { container } = render(
      <TrendComboChart
        title="評価額・利益率の変化"
        caption="直近1年・期末・万円 / 月 / %"
        labels={["1", "2", "3"]}
        sourceDates={["2026-01-31", "2026-02-28", "2026-03-31"]}
        targetPlotWidth={360}
        barSeries={[
          {
            key: "market-ideco",
            label: "iDeCo",
            color: "#2563eb",
            values: [1_000_000, 1_200_000, 1_500_000],
            formatValue: (value) => formatYen(value),
          },
          {
            key: "market-nisa",
            label: "NISA",
            color: "#16a34a",
            values: [500_000, 550_000, 600_000],
            formatValue: (value) => formatYen(value),
          },
        ]}
        lineSeries={[
          {
            key: "gain-ideco",
            label: "iDeCo",
            color: "#2563eb",
            values: [0.05, 0.08, 0.1],
            formatValue: (value) => formatPercent(value),
          },
          {
            key: "gain-nisa",
            label: "NISA",
            color: "#16a34a",
            values: [0.02, 0.03, 0.04],
            formatValue: (value) => formatPercent(value),
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "評価額・利益率の変化" }),
    ).toBeInTheDocument();
    expect(screen.getByText("直近1年・期末・万円 / 月 / %")).toBeInTheDocument();
    expect(
      screen.getByLabelText("評価額と利益率の複合グラフ"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("iDeCo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NISA").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".trend-combo-chart__bar").length).toBeGreaterThan(
      3,
    );
    expect(container.querySelectorAll(".trend-combo-chart__point").length).toBeGreaterThan(
      3,
    );

    const axisLabels = Array.from(
      container.querySelectorAll(".trend-combo-chart__y-label"),
    ).map((node) => node.textContent);
    expect(axisLabels.every((label) => !label?.includes("万円"))).toBe(true);
    expect(axisLabels.every((label) => !label?.includes("%"))).toBe(true);
  });

  it("fits twelve months into the target plot width without forcing scroll width", () => {
    const labels = Array.from({ length: 12 }, (_, index) => `${index + 1}`);
    const values = labels.map((_, index) => 1_000_000 + index * 10_000);
    const rates = labels.map((_, index) => 0.05 + index * 0.002);

    const { container } = render(
      <TrendComboChart
        labels={labels}
        targetPlotWidth={360}
        reservedSlotCount={12}
        barSeries={[
          {
            key: "market-value",
            label: "iDeCo",
            color: "#2563eb",
            values,
          },
        ]}
        lineSeries={[
          {
            key: "gain-rate",
            label: "iDeCo",
            color: "#2563eb",
            values: rates,
          },
        ]}
      />,
    );

    const svg = container.querySelector(".trend-combo-chart__svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 440 240");
    expect(container.querySelectorAll(".trend-combo-chart__bar")).toHaveLength(12);
  });

  it("keeps year-capacity spacing even when fewer months exist", () => {
    const { container } = render(
      <TrendComboChart
        labels={["5", "6"]}
        targetPlotWidth={360}
        reservedSlotCount={12}
        barSeries={[
          {
            key: "market-value",
            label: "iDeCo",
            color: "#2563eb",
            values: [1_000_000, 1_100_000],
          },
        ]}
        lineSeries={[
          {
            key: "gain-rate",
            label: "iDeCo",
            color: "#2563eb",
            values: [0.05, 0.06],
          },
        ]}
      />,
    );

    const bars = container.querySelectorAll(".trend-combo-chart__bar");
    expect(bars).toHaveLength(2);
    const firstBarX = Number(bars[0].getAttribute("x"));
    const secondBarX = Number(bars[1].getAttribute("x"));
    expect(secondBarX - firstBarX).toBeCloseTo(30, 0);
  });

  it("shows tooltip values for both series", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrendComboChart
        labels={["6"]}
        sourceDates={["2026-06-30"]}
        barSeries={[
          {
            key: "market-value",
            label: "iDeCo",
            color: "#2563eb",
            values: [3_000_000],
            formatValue: (value) => formatYen(value),
          },
        ]}
        lineSeries={[
          {
            key: "gain-rate",
            label: "iDeCo",
            color: "#2563eb",
            values: [0.12],
            formatValue: (value) => formatPercent(value),
          },
        ]}
      />,
    );

    const hitArea = within(container).getByRole("button", {
      name: "6 の詳細",
    });
    await user.hover(hitArea);
    expect(container.querySelector(".trend-combo-chart__tooltip")).toBeTruthy();
    expect(container.textContent).toContain(formatYen(3_000_000));
    expect(container.textContent).toContain(formatPercent(0.12));
  });

  it("keeps the leftmost tooltip aligned to the right so it is not clipped", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TrendComboChart
        labels={["7"]}
        sourceDates={["2026-07-11"]}
        reservedSlotCount={12}
        targetPlotWidth={360}
        barSeries={[
          {
            key: "market-value",
            label: "iDeCo",
            color: "#2563eb",
            values: [3_000_000],
            formatValue: (value) => formatYen(value),
          },
        ]}
        lineSeries={[
          {
            key: "gain-rate",
            label: "iDeCo",
            color: "#2563eb",
            values: [0.2],
            formatValue: (value) => formatPercent(value),
          },
        ]}
      />,
    );

    const hitArea = within(container).getByRole("button", {
      name: "7 の詳細",
    });
    await user.hover(hitArea);
    const tooltip = container.querySelector(".trend-combo-chart__tooltip");
    expect(tooltip).toBeTruthy();
    expect(tooltip?.getAttribute("style") ?? "").toContain("translateX(0)");
  });
});
