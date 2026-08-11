import { describe, expect, it } from "vitest";

import type { HoldingLineInput } from "../src/schemas";
import {
  applySbiWrapProductCostsToHoldingInputs,
  buildSbiWrapProductCostMetricCode,
  buildSbiWrapProductCostMetricInputs,
  listSbiWrapProductCostMetricCodes,
  parseSbiWrapProductCodeFromCostMetric,
  readSbiWrapProductCostsFromMetrics,
  resolveSbiWrapProductCostMetricLabel,
} from "../src/sbi-wrap-product-costs";

function line(params: {
  instrumentId: string;
  accountId: string;
  marketValueMinor: number;
  bookValueMinor?: number | null;
  metrics?: HoldingLineInput["metrics"];
}): HoldingLineInput {
  let result: HoldingLineInput = {
    instrumentId: params.instrumentId,
    accountId: params.accountId,
    accountName: params.accountId.replace("sbi-wrap:", ""),
    quantity: 1,
    marketValueMinor: params.marketValueMinor,
    bookValueMinor: params.bookValueMinor ?? null,
    sortOrder: 1,
    metrics: params.metrics ?? [{ code: "account_type", textValue: "AI投資" }],
  };
  return result;
}

describe("sbi-wrap-product-costs", () => {
  it("builds and parses product cost metric codes", () => {
    expect(buildSbiWrapProductCostMetricCode("ai_investment")).toBe(
      "sbi_wrap_product_cost_ai_investment",
    );
    expect(listSbiWrapProductCostMetricCodes()).toHaveLength(5);
    expect(parseSbiWrapProductCodeFromCostMetric("sbi_wrap_product_cost_takumi")).toBe(
      "takumi",
    );
    expect(parseSbiWrapProductCodeFromCostMetric("other")).toBeNull();
    expect(resolveSbiWrapProductCostMetricLabel("sbi_wrap_product_cost_rebanavi")).toBe(
      "レバナビ 購入金額",
    );
  });

  it("reads and builds product cost metric inputs", () => {
    const costs = readSbiWrapProductCostsFromMetrics([
      { code: "sbi_wrap_product_cost_ai_investment", integerValue: 10_000 },
      { code: "ideco_total_contributions", integerValue: 1 },
      { code: "sbi_wrap_product_cost_takumi", integerValue: null },
    ]);
    expect(costs).toEqual({ ai_investment: 10_000 });

    expect(
      buildSbiWrapProductCostMetricInputs({
        ai_investment: 10_000,
        rebanavi: 20_000,
      }),
    ).toEqual([
      { code: "sbi_wrap_product_cost_ai_investment", integerValue: 10_000 },
      { code: "sbi_wrap_product_cost_rebanavi", integerValue: 20_000 },
    ]);
  });

  it("distributes product cost by market value within account", () => {
    const lines = applySbiWrapProductCostsToHoldingInputs(
      [
        line({
          instrumentId: "11111111-1111-1111-1111-111111111111",
          accountId: "sbi-wrap:AI投資",
          marketValueMinor: 75_000,
        }),
        line({
          instrumentId: "22222222-2222-2222-2222-222222222222",
          accountId: "sbi-wrap:AI投資",
          marketValueMinor: 25_000,
        }),
        line({
          instrumentId: "33333333-3333-3333-3333-333333333333",
          accountId: "sbi-wrap:レバナビ",
          marketValueMinor: 50_000,
          metrics: [{ code: "account_type", textValue: "レバナビ" }],
        }),
      ],
      { ai_investment: 10_000 },
    );

    expect(lines[0]?.bookValueMinor).toBe(7500);
    expect(lines[1]?.bookValueMinor).toBe(2500);
    expect(lines[2]?.bookValueMinor).toBeNull();

    const gain0 = lines[0]?.metrics?.find((m) => m.code === "unrealized_gain_minor");
    expect(gain0?.integerValue).toBe(67_500);
    const rate0 = lines[0]?.metrics?.find((m) => m.code === "unrealized_gain_rate");
    expect(rate0?.realValue).toBeCloseTo(9);
    expect(lines[0]?.metrics?.some((m) => m.code === "account_type")).toBe(true);
  });

  it("assigns zero book values when product cost is zero", () => {
    const lines = applySbiWrapProductCostsToHoldingInputs(
      [
        line({
          instrumentId: "11111111-1111-1111-1111-111111111111",
          accountId: "sbi-wrap:匠の運用",
          marketValueMinor: 12_000,
          metrics: [{ code: "account_type", textValue: "匠の運用" }],
        }),
      ],
      { takumi: 0 },
    );

    expect(lines[0]?.bookValueMinor).toBe(0);
    const gain = lines[0]?.metrics?.find((m) => m.code === "unrealized_gain_minor");
    expect(gain?.integerValue).toBe(12_000);
    const rate = lines[0]?.metrics?.find((m) => m.code === "unrealized_gain_rate");
    expect(rate?.realValue).toBeNull();
  });

  it("adjusts remainder on the last line", () => {
    const lines = applySbiWrapProductCostsToHoldingInputs(
      [
        line({
          instrumentId: "11111111-1111-1111-1111-111111111111",
          accountId: "sbi-wrap:ALL株式",
          marketValueMinor: 1,
          metrics: [{ code: "account_type", textValue: "ALL株式" }],
        }),
        line({
          instrumentId: "22222222-2222-2222-2222-222222222222",
          accountId: "sbi-wrap:ALL株式",
          marketValueMinor: 1,
          metrics: [{ code: "account_type", textValue: "ALL株式" }],
        }),
        line({
          instrumentId: "33333333-3333-3333-3333-333333333333",
          accountId: "sbi-wrap:ALL株式",
          marketValueMinor: 1,
          metrics: [{ code: "account_type", textValue: "ALL株式" }],
        }),
      ],
      { all_equity: 10_000 },
    );

    const books = lines.map((item) => item.bookValueMinor);
    expect(books.reduce((sum, value) => (sum ?? 0) + (value ?? 0), 0)).toBe(10_000);
  });
});
