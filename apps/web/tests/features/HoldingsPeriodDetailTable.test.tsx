import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HoldingsPeriodDetailTable } from "@/features/holdings/HoldingsPeriodDetailTable";
import {
  buildHoldingPeriodChangeRows,
  IDECO_KAKEIBO_METRIC_CODES,
} from "@repo/shared";
import type { AnalysisSchemeConfig, HoldingLineDto } from "@repo/shared";

function makeLine(
  overrides: Partial<HoldingLineDto> & Pick<HoldingLineDto, "id" | "instrumentId">,
): HoldingLineDto {
  let result: HoldingLineDto = {
    id: overrides.id,
    instrumentId: overrides.instrumentId,
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

describe("HoldingsPeriodDetailTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders no classification columns when schemes are empty", () => {
    const rows = buildHoldingPeriodChangeRows(
      [makeLine({ id: "l1", instrumentId: "i1", instrumentName: "無分類" })],
      null,
    );

    render(
      <HoldingsPeriodDetailTable
        rows={rows}
        classificationSchemes={[]}
        showDeltas={false}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "銘柄" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "地域分類" })).not.toBeInTheDocument();
    expect(screen.getByText("無分類")).toBeInTheDocument();
  });

  it("renders dynamic classification columns and delta sub-rows", () => {
    const classificationSchemes: AnalysisSchemeConfig[] = [
      { schemeCode: "region", schemeName: "地域分類" },
    ];
    const endLines = [
      makeLine({
        id: "l1",
        instrumentId: "i1",
        instrumentName: "ファンドA",
        quantity: 120,
        marketValueMinor: 12000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: 1100,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 3000,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            integerValue: null,
            realValue: 0.12,
            textValue: null,
          },
        ],
        tags: [
          {
            schemeCode: "region",
            schemeName: "地域分類",
            valueCode: "domestic",
            valueName: "国内",
          },
        ],
      }),
    ];
    const startLines = [
      makeLine({
        id: "l0",
        instrumentId: "i1",
        quantity: 100,
        marketValueMinor: 10000,
        metrics: [
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unitPricePerTenThousandLots,
            integerValue: 1000,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainMinor,
            integerValue: 1000,
            realValue: null,
            textValue: null,
          },
          {
            code: IDECO_KAKEIBO_METRIC_CODES.unrealizedGainRate,
            integerValue: null,
            realValue: 0.1,
            textValue: null,
          },
        ],
      }),
    ];
    const rows = buildHoldingPeriodChangeRows(endLines, startLines);

    render(
      <HoldingsPeriodDetailTable
        rows={rows}
        classificationSchemes={classificationSchemes}
        showDeltas={true}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "地域分類" })).toBeInTheDocument();
    expect(screen.getByText("国内")).toBeInTheDocument();
    expect(screen.getByText("+20")).toBeInTheDocument();
    expect(screen.getAllByText(/\+.*2,000/).length).toBeGreaterThanOrEqual(1);
  });

  it("hides delta sub-rows when showDeltas is false", () => {
    const endLines = [
      makeLine({
        id: "l1",
        instrumentId: "i1",
        instrumentName: "ファンドA",
        quantity: 120,
        marketValueMinor: 12000,
      }),
    ];
    const startLines = [
      makeLine({
        id: "l0",
        instrumentId: "i1",
        quantity: 100,
        marketValueMinor: 10000,
      }),
    ];
    const rows = buildHoldingPeriodChangeRows(endLines, startLines);

    render(
      <HoldingsPeriodDetailTable
        rows={rows}
        classificationSchemes={[]}
        showDeltas={false}
      />,
    );

    expect(screen.queryByText("+20")).not.toBeInTheDocument();
  });

  it("sorts rows when a column header is clicked", () => {
    const rows = buildHoldingPeriodChangeRows(
      [
        makeLine({
          id: "low",
          instrumentId: "i1",
          instrumentName: "評価額小",
          marketValueMinor: 100,
        }),
        makeLine({
          id: "high",
          instrumentId: "i2",
          instrumentName: "評価額大",
          marketValueMinor: 500,
        }),
      ],
      null,
    );

    render(
      <HoldingsPeriodDetailTable
        rows={rows}
        classificationSchemes={[]}
        showDeltas={false}
      />,
    );

    const instrumentRows = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .filter((row) => row.textContent?.includes("評価額"));

    expect(instrumentRows()[0]?.textContent).toContain("評価額小");

    fireEvent.click(screen.getByRole("button", { name: /資産残高/ }));
    fireEvent.click(screen.getByRole("button", { name: /資産残高/ }));

    expect(instrumentRows()[0]?.textContent).toContain("評価額大");
  });
});
