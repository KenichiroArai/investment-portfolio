import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TrendStackedAreaChart } from "@/features/trends/TrendStackedAreaChart";

describe("TrendStackedAreaChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders stacked area chart with percent axis", () => {
    render(
      <TrendStackedAreaChart
        title="構成比の推移"
        labels={["2026/6/1", "2026/7/1"]}
        sourceDates={["2026-06-07", "2026-07-01"]}
        series={[
          {
            key: "equity",
            label: "株式",
            color: "#2563eb",
            values: [0.6, 0.55],
          },
          {
            key: "bond",
            label: "債券",
            color: "#16a34a",
            values: [0.4, 0.45],
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "構成比の推移" })).toBeInTheDocument();
    expect(screen.getByLabelText("構成比積み上げエリアグラフ")).toBeInTheDocument();
    expect(screen.getByText("株式")).toBeInTheDocument();
    expect(screen.getByText("債券")).toBeInTheDocument();
  });
});
