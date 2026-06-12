import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrendMetricTabs } from "@/features/trends/TrendMetricTabs";
import { formatPercent, formatYen } from "@/lib/format-yen";

const baseProps = {
  labels: ["2026年5月", "2026年6月"],
  sourceDates: ["2026-05-31", "2026-06-07"],
  sourceDateLabels: ["2026/5/31", "2026/6/7"],
  trendDisplayUnitLabel: "1か月単位",
  marketValueLevelValues: [3_400_000, 3_441_347],
  marketValueDeltaSeries: [
    {
      key: "market-value-delta",
      label: "評価額の変化",
      color: "#2563eb",
      values: [null, 41_347],
      formatValue: (value: number) => formatYen(value),
    },
  ],
  gainDeltaSeries: [
    {
      key: "gain-delta",
      label: "評価損益の変化",
      color: "#16a34a",
      values: [null, 59_121],
      formatValue: (value: number) => formatYen(value),
    },
  ],
  gainRateSeries: [
    {
      key: "gain-rate-book",
      label: "簿価ベース利益率",
      color: "#7c3aed",
      values: [0.13, 0.15],
      formatValue: (value: number) => formatPercent(value),
    },
    {
      key: "gain-rate-contributions",
      label: "拠出金ベース利益率",
      color: "#ea580c",
      values: [null, 0.05],
      formatValue: (value: number) => formatPercent(value),
    },
  ],
  allocation: {
    schemeCodes: [
      { schemeCode: "ideco_region", schemeName: "地域分類" },
      { schemeCode: "ideco_asset_class", schemeName: "資産分類" },
    ],
    activeSchemeCode: "ideco_region",
    onSchemeChange: vi.fn(),
    activeSchemeName: "地域分類",
    allocationSeries: [
      {
        key: "domestic",
        label: "国内",
        color: "#2563eb",
        values: [0.6, 0.61],
      },
      {
        key: "foreign",
        label: "海外",
        color: "#16a34a",
        values: [0.4, 0.39],
      },
    ],
    ratioSeries: [
      {
        key: "domestic",
        label: "国内",
        values: [0.6, 0.61],
      },
    ],
    periodChangeRows: [
      {
        key: "foreign",
        label: "海外",
        startRatio: 0.4,
        endRatio: 0.39,
        deltaRatio: -0.01,
        startMarketValueMinor: 1_400_000,
        endMarketValueMinor: 1_341_347,
        deltaMarketValueMinor: -58_653,
        ratioSeries: [0.4, 0.39],
      },
    ],
    selectedCompositionKeys: ["foreign"],
    onCompositionToggle: vi.fn(),
    startDateLabel: "2026/05/31",
    endDateLabel: "2026/06/07",
  },
};

describe("TrendMetricTabs", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders main tabs in order with 構成比 selected by default", () => {
    render(<TrendMetricTabs {...baseProps} />);

    const metricTabs = within(screen.getByRole("tablist", { name: "指標" }));
    const tabs = metricTabs.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "構成比",
      "評価額",
      "損益",
      "利益率",
    ]);
    expect(metricTabs.getByRole("tab", { name: "構成比", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "構成比の推移" })).toBeInTheDocument();
  });

  it("defaults to 評価額 when allocation is unavailable", () => {
    render(<TrendMetricTabs {...baseProps} allocation={null} />);

    const metricTabs = within(screen.getByRole("tablist", { name: "指標" }));
    expect(metricTabs.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "評価額",
      "損益",
      "利益率",
    ]);
    expect(metricTabs.getByRole("tab", { name: "評価額", selected: true })).toBeInTheDocument();
  });

  it("hides 利益率 tab when gain rate series is empty", () => {
    render(<TrendMetricTabs {...baseProps} gainRateSeries={[]} />);

    const metricTabs = within(screen.getByRole("tablist", { name: "指標" }));
    expect(metricTabs.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "構成比",
      "評価額",
      "損益",
    ]);
  });

  it("switches charts via main and sub tabs", async () => {
    const user = userEvent.setup();
    render(<TrendMetricTabs {...baseProps} />);

    const metricTabs = within(screen.getByRole("tablist", { name: "指標" }));

    await user.click(metricTabs.getByRole("tab", { name: "評価額" }));
    const marketValueViews = within(
      screen.getByRole("tablist", { name: "評価額の表示" }),
    );

    await user.click(marketValueViews.getByRole("tab", { name: "増減" }));
    expect(screen.getByRole("heading", { name: "評価額の増減" })).toBeInTheDocument();
    expect(screen.getByLabelText("推移棒グラフ")).toBeInTheDocument();

    await user.click(metricTabs.getByRole("tab", { name: "損益" }));
    expect(screen.getByRole("heading", { name: "評価損益の増減" })).toBeInTheDocument();

    await user.click(metricTabs.getByRole("tab", { name: "利益率" }));
    const gainRateViews = within(screen.getByRole("tablist", { name: "利益率の表示" }));
    expect(gainRateViews.getByRole("tab", { name: "簿価ベース", selected: true })).toBeInTheDocument();

    await user.click(gainRateViews.getByRole("tab", { name: "拠出金ベース" }));
    expect(
      gainRateViews.getByRole("tab", { name: "拠出金ベース", selected: true }),
    ).toBeInTheDocument();

    await user.click(metricTabs.getByRole("tab", { name: "構成比" }));
    expect(screen.getByRole("heading", { name: "構成比の推移" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "期間内の構成変化" })).toBeInTheDocument();
  });
});
