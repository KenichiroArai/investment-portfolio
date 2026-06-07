import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HoldingsDetailTable } from "@/features/holdings/HoldingsDetailTable";
import type { AnalysisSchemeConfig, HoldingLineDto } from "@repo/shared";

function makeLine(
  overrides: Partial<HoldingLineDto> & Pick<HoldingLineDto, "id">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id,
    instrumentId: overrides.instrumentId ?? "inst-1",
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 1,
    marketValueMinor: overrides.marketValueMinor ?? 1000,
    bookValueMinor: overrides.bookValueMinor ?? null,
    metrics: overrides.metrics ?? [],
    instrumentAttributes: overrides.instrumentAttributes ?? [],
    tags: overrides.tags ?? [],
  };
  return result;
}

describe("HoldingsDetailTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders no classification columns when schemes are empty", () => {
    render(
      <HoldingsDetailTable
        lines={[makeLine({ id: "l1", instrumentName: "無分類" })]}
        classificationSchemes={[]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "銘柄" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "地域分類" })).not.toBeInTheDocument();
    expect(screen.getByText("無分類")).toBeInTheDocument();
  });

  it("renders dynamic classification columns and values", () => {
    const classificationSchemes: AnalysisSchemeConfig[] = [
      { schemeCode: "region", schemeName: "地域分類" },
      { schemeCode: "asset", schemeName: "資産分類" },
    ];
    const lines = [
      makeLine({
        id: "l1",
        instrumentName: "ファンドA",
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      }),
      makeLine({
        id: "l2",
        instrumentName: "ファンドB",
        tags: [
          {
            schemeCode: "asset",
            schemeName: "資産分類",
            valueCode: "equity",
            valueName: "株式",
          },
        ],
      }),
    ];

    render(
      <HoldingsDetailTable
        lines={lines}
        classificationSchemes={classificationSchemes}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "地域分類" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "資産分類" })).toBeInTheDocument();
    expect(screen.getByText("国内")).toBeInTheDocument();
    expect(screen.getByText("株式")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("sorts rows when a column header is clicked", () => {
    const lines = [
      makeLine({
        id: "low",
        instrumentName: "評価額小",
        marketValueMinor: 100,
      }),
      makeLine({
        id: "high",
        instrumentName: "評価額大",
        marketValueMinor: 500,
      }),
    ];

    render(
      <HoldingsDetailTable lines={lines} classificationSchemes={[]} />,
    );

    const rows = () =>
      screen.getAllByRole("row").slice(1).map((row) => row.textContent);

    expect(rows()[0]).toContain("評価額小");

    fireEvent.click(screen.getByRole("button", { name: /資産残高/ }));

    expect(rows()[0]).toContain("評価額小");

    fireEvent.click(screen.getByRole("button", { name: /資産残高/ }));

    expect(rows()[0]).toContain("評価額大");
  });
});
