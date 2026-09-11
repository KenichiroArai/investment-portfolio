import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AllocationTable } from "@/features/analysis/AllocationTable";
import { makeAllocationSlice, sampleAllocationSlices } from "./allocation-fixtures";

describe("AllocationTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty message when slices are empty", () => {
    render(
      <AllocationTable
        slices={[]}
        highlightedValueCode={null}
        expandedValueCodes={[]}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getByText("該当する分類タグがありません。")).toBeInTheDocument();
  });

  it("renders gain and gain rate column headers", () => {
    render(
      <AllocationTable
        slices={sampleAllocationSlices}
        highlightedValueCode={null}
        expandedValueCodes={[]}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "損益" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "損益率" })).toBeInTheDocument();
  });

  it("uses configured display order initially", () => {
    const slices = sampleAllocationSlices.map((slice) => {
      let result = {
        ...slice,
        sortOrder: slice.valueCode === "foreign" ? 0 : 1,
      };
      return result;
    });

    render(
      <AllocationTable
        slices={slices}
        highlightedValueCode={null}
        expandedValueCodes={[]}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("row")[1]?.textContent).toContain("海外");
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
        expandedValueCodes={[]}
        onSliceHover={onSliceHover}
        onSliceLeave={onSliceLeave}
        onToggleExpand={onToggleExpand}
      />,
    );

    const firstSliceName = () =>
      screen.getAllByRole("row")[1]?.textContent ?? "";

    expect(firstSliceName()).toContain("海外");

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

  it("does not aggregate same-name holdings across classification slices", () => {
    const slices = sampleAllocationSlices.map((slice) => {
      let result = {
        ...slice,
        lines: slice.lines.map((lineInSlice) => {
          let lineResult = {
            ...lineInSlice,
            line: {
              ...lineInSlice.line,
              instrumentName: "共通ファンド",
            },
          };
          return lineResult;
        }),
      };
      return result;
    });

    render(
      <AllocationTable
        slices={slices}
        highlightedValueCode={null}
        expandedValueCodes={["domestic", "foreign"]}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getAllByText("共通ファンド")).toHaveLength(2);
  });

  it("expands parent rows to show child and grandchild categories", async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();
    const rootSlices = [
      makeAllocationSlice({
        valueCode: "stock",
        valueName: "株式",
        marketValueMinor: 1_000_000,
        weight: 1,
      }),
    ];
    const childSlicesByParentValueId = new Map([
      [
        "stock-id",
        [
          makeAllocationSlice({
            valueCode: "domestic",
            valueName: "国内株式",
            marketValueMinor: 600_000,
            weight: 0.6,
          }),
          makeAllocationSlice({
            valueCode: "developed",
            valueName: "先進国株式",
            marketValueMinor: 400_000,
            weight: 0.4,
            lines: [
              {
                line: {
                  id: "line-dev",
                  instrumentId: "inst-dev",
                  instrumentName: "先進国ファンド",
                  accountId: "acc-1",
                  accountName: "口座",
                  sortOrder: 0,
                  quantity: 1,
                  marketValueMinor: 400_000,
                  bookValueMinor: 400_000,
                  metrics: [],
                  instrumentAttributes: [],
                  tags: [],
                },
                weightInSlice: 1,
                attributedMarketValueMinor: 400_000,
                attributedBookValueMinor: 400_000,
                attributedUnrealizedGainMinor: null,
                attributedUnrealizedGainRate: null,
              },
            ],
          }),
        ],
      ],
      [
        "domestic-id",
        [
          makeAllocationSlice({
            valueCode: "income",
            valueName: "高配当",
            marketValueMinor: 600_000,
            weight: 0.6,
            lines: [
              {
                line: {
                  id: "line-income",
                  instrumentId: "inst-income",
                  instrumentName: "高配当ファンド",
                  accountId: "acc-1",
                  accountName: "口座",
                  sortOrder: 0,
                  quantity: 1,
                  marketValueMinor: 600_000,
                  bookValueMinor: 600_000,
                  metrics: [],
                  instrumentAttributes: [],
                  tags: [],
                },
                weightInSlice: 1,
                attributedMarketValueMinor: 600_000,
                attributedBookValueMinor: 600_000,
                attributedUnrealizedGainMinor: null,
                attributedUnrealizedGainRate: null,
              },
            ],
          }),
        ],
      ],
    ]);
    const valueIdByCode = new Map([
      ["stock", "stock-id"],
      ["domestic", "domestic-id"],
      ["developed", "developed-id"],
      ["income", "income-id"],
    ]);

    const { rerender } = render(
      <AllocationTable
        slices={rootSlices}
        highlightedValueCode={null}
        expandedValueCodes={[]}
        valueIdByCode={valueIdByCode}
        childSlicesByParentValueId={childSlicesByParentValueId}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={onToggleExpand}
      />,
    );

    expect(screen.queryByText("国内株式")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "株式 の子分類を開く" }));
    expect(onToggleExpand).toHaveBeenCalledWith("stock");

    rerender(
      <AllocationTable
        slices={rootSlices}
        highlightedValueCode={null}
        expandedValueCodes={["stock"]}
        valueIdByCode={valueIdByCode}
        childSlicesByParentValueId={childSlicesByParentValueId}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={onToggleExpand}
      />,
    );

    expect(screen.getByText("国内株式")).toBeInTheDocument();
    expect(screen.getByText("先進国株式")).toBeInTheDocument();
    expect(screen.queryByText("高配当")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "国内株式 の子分類を開く" }));
    expect(onToggleExpand).toHaveBeenCalledWith("stock/domestic");

    rerender(
      <AllocationTable
        slices={rootSlices}
        highlightedValueCode={null}
        expandedValueCodes={["stock", "stock/domestic"]}
        valueIdByCode={valueIdByCode}
        childSlicesByParentValueId={childSlicesByParentValueId}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={onToggleExpand}
      />,
    );

    expect(screen.getByText("高配当")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "高配当 の内訳を開く" }));
    expect(onToggleExpand).toHaveBeenCalledWith("stock/domestic/income");

    rerender(
      <AllocationTable
        slices={rootSlices}
        highlightedValueCode={null}
        expandedValueCodes={["stock", "stock/domestic", "stock/domestic/income"]}
        valueIdByCode={valueIdByCode}
        childSlicesByParentValueId={childSlicesByParentValueId}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={onToggleExpand}
      />,
    );

    expect(screen.getByText("高配当ファンド")).toBeInTheDocument();
  });

  it("does not sync expand state for the same shared child under different parents", () => {
    const rootSlices = [
      makeAllocationSlice({
        valueCode: "domestic_equity",
        valueName: "国内株式",
        marketValueMinor: 600_000,
        weight: 0.6,
      }),
      makeAllocationSlice({
        valueCode: "developed_equity",
        valueName: "先進国株式",
        marketValueMinor: 400_000,
        weight: 0.4,
      }),
    ];
    const incomeUnderDomestic = makeAllocationSlice({
      valueCode: "income",
      valueName: "インカム",
      marketValueMinor: 100_000,
      weight: 0.1,
      lines: [
        {
          line: {
            id: "line-dom-income",
            instrumentId: "inst-dom-income",
            instrumentName: "国内インカムファンド",
            accountId: "acc-1",
            accountName: "口座",
            sortOrder: 0,
            quantity: 1,
            marketValueMinor: 100_000,
            bookValueMinor: 100_000,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 1,
          attributedMarketValueMinor: 100_000,
          attributedBookValueMinor: 100_000,
          attributedUnrealizedGainMinor: null,
          attributedUnrealizedGainRate: null,
        },
      ],
    });
    const incomeUnderDeveloped = makeAllocationSlice({
      valueCode: "income",
      valueName: "インカム",
      marketValueMinor: 200_000,
      weight: 0.2,
      lines: [
        {
          line: {
            id: "line-dev-income",
            instrumentId: "inst-dev-income",
            instrumentName: "先進国インカムファンド",
            accountId: "acc-1",
            accountName: "口座",
            sortOrder: 0,
            quantity: 1,
            marketValueMinor: 200_000,
            bookValueMinor: 200_000,
            metrics: [],
            instrumentAttributes: [],
            tags: [],
          },
          weightInSlice: 1,
          attributedMarketValueMinor: 200_000,
          attributedBookValueMinor: 200_000,
          attributedUnrealizedGainMinor: null,
          attributedUnrealizedGainRate: null,
        },
      ],
    });
    const childSlicesByParentValueId = new Map([
      ["domestic-id", [incomeUnderDomestic]],
      ["developed-id", [incomeUnderDeveloped]],
    ]);
    const valueIdByCode = new Map([
      ["domestic_equity", "domestic-id"],
      ["developed_equity", "developed-id"],
      ["income", "income-id"],
    ]);

    render(
      <AllocationTable
        slices={rootSlices}
        highlightedValueCode={null}
        expandedValueCodes={["domestic_equity", "developed_equity", "domestic_equity/income"]}
        valueIdByCode={valueIdByCode}
        childSlicesByParentValueId={childSlicesByParentValueId}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getByText("国内インカムファンド")).toBeInTheDocument();
    expect(screen.queryByText("先進国インカムファンド")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "インカム の内訳を閉じる" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "インカム の内訳を開く" }),
    ).toBeInTheDocument();
  });

  it("drills down via category name while chevron still expands", async () => {
    const user = userEvent.setup();
    const onDrillDown = vi.fn();
    const onToggleExpand = vi.fn();
    const rootSlices = [
      makeAllocationSlice({
        valueCode: "stock",
        valueName: "株式",
        marketValueMinor: 1_000_000,
        weight: 1,
      }),
      makeAllocationSlice({
        valueCode: "bond",
        valueName: "債券",
        marketValueMinor: 500_000,
        weight: 0.5,
      }),
    ];
    const valueIdByCode = new Map([
      ["stock", "stock-id"],
      ["bond", "bond-id"],
    ]);
    const childSlicesByParentValueId = new Map([
      [
        "stock-id",
        [
          makeAllocationSlice({
            valueCode: "domestic",
            valueName: "国内株式",
            marketValueMinor: 600_000,
            weight: 0.6,
          }),
        ],
      ],
    ]);
    const drillableValueIds = new Set(["stock-id"]);

    render(
      <AllocationTable
        slices={rootSlices}
        highlightedValueCode={null}
        expandedValueCodes={[]}
        portfolioCode="ideco"
        schemeCode="ideco_region"
        valueIdByCode={valueIdByCode}
        childSlicesByParentValueId={childSlicesByParentValueId}
        drillableValueIds={drillableValueIds}
        onSliceHover={vi.fn()}
        onSliceLeave={vi.fn()}
        onToggleExpand={onToggleExpand}
        onDrillDown={onDrillDown}
      />,
    );

    await user.click(screen.getByRole("button", { name: "株式 の子分類を開く" }));
    expect(onToggleExpand).toHaveBeenCalledWith("stock");
    expect(onDrillDown).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "株式" }));
    expect(onDrillDown).toHaveBeenCalledWith("stock-id");

    expect(
      screen.getByRole("link", { name: "株式 の保有明細を見る" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/portfolios/ideco/portfolio-allocation"),
    );

    await user.click(screen.getByRole("button", { name: "債券 の内訳を開く" }));
    expect(onToggleExpand).toHaveBeenCalledWith("bond");
  });
});
