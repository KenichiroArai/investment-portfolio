import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL,
  HoldingLineDetailTable,
  type HoldingLineDetailRow,
} from "@/features/holdings/HoldingLineDetailTable";

function makeRow(
  overrides: Partial<HoldingLineDetailRow> & Pick<HoldingLineDetailRow, "id">,
): HoldingLineDetailRow {
  let result: HoldingLineDetailRow = {
    id: overrides.id,
    instrumentName: overrides.instrumentName ?? "テスト銘柄",
    quantity: overrides.quantity ?? 1,
    marketValueMinor: overrides.marketValueMinor ?? 100_000,
    weight: overrides.weight ?? 0.5,
    metrics: overrides.metrics ?? [],
    portfolioName: overrides.portfolioName,
  };
  return result;
}

describe("HoldingLineDetailTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders rows with custom weight column label", () => {
    render(
      <HoldingLineDetailTable
        rows={[makeRow({ id: "r1", instrumentName: "ファンドA" })]}
        portfolioKind="ideco"
        weightColumnLabel={HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL}
      />,
    );

    expect(screen.getByText("ファンドA")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: HOLDING_LINE_DETAIL_WEIGHT_COLUMN_LABEL }),
    ).toBeInTheDocument();
  });

  it("sorts rows when column headers are clicked", async () => {
    const user = userEvent.setup();
    const rows = [
      makeRow({ id: "low", instrumentName: "評価額小", marketValueMinor: 100 }),
      makeRow({ id: "high", instrumentName: "評価額大", marketValueMinor: 500 }),
    ];

    render(
      <HoldingLineDetailTable
        rows={rows}
        portfolioKind="ideco"
        weightColumnLabel="構成比"
      />,
    );

    const bodyRows = () =>
      screen.getAllByRole("row").slice(1).map((row) => row.textContent);

    expect(bodyRows()[0]).toContain("評価額大");

    await user.click(screen.getByRole("button", { name: /評価額/ }));
    expect(bodyRows()[0]).toContain("評価額小");

    await user.click(screen.getByRole("button", { name: /評価額/ }));
    expect(bodyRows()[0]).toContain("評価額大");
  });

  it("renders portfolio column and placeholder when name is missing", () => {
    render(
      <HoldingLineDetailTable
        rows={[makeRow({ id: "r1", portfolioName: undefined })]}
        portfolioKind="ideco"
        weightColumnLabel="構成比"
        showPortfolioColumn
      />,
    );

    expect(screen.getByRole("columnheader", { name: "口座" })).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });
});
