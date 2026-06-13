import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HoldingsRangeDetailTable } from "@/features/holdings/HoldingsRangeDetailTable";
import type { HoldingDetailRow } from "@repo/shared";

function makeRow(
  overrides: Partial<HoldingDetailRow> & Pick<HoldingDetailRow, "asOfDate" | "instrumentId">,
): HoldingDetailRow {
  let result: HoldingDetailRow = {
    asOfDate: overrides.asOfDate,
    instrumentId: overrides.instrumentId,
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    sortOrder: overrides.sortOrder ?? 0,
    quantity: overrides.quantity ?? 100,
    marketValueMinor: overrides.marketValueMinor ?? 10000,
    bookValueMinor: overrides.bookValueMinor ?? 9000,
    unitPrice: overrides.unitPrice ?? null,
    unrealizedGainMinor: overrides.unrealizedGainMinor ?? null,
    unrealizedGainRate: overrides.unrealizedGainRate ?? null,
    tags: overrides.tags ?? [],
  };
  return result;
}

describe("HoldingsRangeDetailTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders asOfDate column and rows", () => {
    render(
      <HoldingsRangeDetailTable
        rows={[
          makeRow({
            asOfDate: "2026-06-07",
            instrumentId: "i1",
            instrumentName: "国内株式",
          }),
          makeRow({
            asOfDate: "2026-06-01",
            instrumentId: "i2",
            instrumentName: "外国債券",
          }),
        ]}
        classificationSchemes={[]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "基準日" })).toBeInTheDocument();
    expect(screen.getByText("国内株式")).toBeInTheDocument();
    expect(screen.getByText("外国債券")).toBeInTheDocument();
    expect(screen.getByText("2026/06/07")).toBeInTheDocument();
    expect(screen.getByText("2026/06/01")).toBeInTheDocument();
  });

  it("shows empty message when rows are empty", () => {
    render(
      <HoldingsRangeDetailTable rows={[]} classificationSchemes={[]} />,
    );

    expect(
      screen.getByText("条件に一致する明細がありません。"),
    ).toBeInTheDocument();
  });

  it("sorts by asOfDate when header is clicked", async () => {
    render(
      <HoldingsRangeDetailTable
        rows={[
          makeRow({
            asOfDate: "2026-06-01",
            instrumentId: "i1",
            instrumentName: "A",
          }),
          makeRow({
            asOfDate: "2026-06-07",
            instrumentId: "i2",
            instrumentName: "B",
          }),
        ]}
        classificationSchemes={[]}
      />,
    );

    const dateHeader = screen.getByRole("button", { name: "基準日" });
    fireEvent.click(dateHeader);

    await waitFor(() => {
      const cells = screen.getAllByRole("cell");
      expect(cells[0]?.textContent).toBe("2026/06/01");
    });
  });
});
