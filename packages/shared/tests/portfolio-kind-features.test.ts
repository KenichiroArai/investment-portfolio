import { describe, expect, it } from "vitest";

import {
  getHoldingUnitPriceMetricCode,
  getPortfolioKindFeatures,
  shouldShowHoldingColumn,
} from "../src/portfolio-kind-features";

describe("portfolio-kind-features", () => {
  it("shows contributions only for ideco", () => {
    expect(getPortfolioKindFeatures("ideco").showContributions).toBe(true);
    expect(getPortfolioKindFeatures("monex").showContributions).toBe(false);
  });

  it("shows monex-specific holding columns", () => {
    expect(shouldShowHoldingColumn("monex", "accountType")).toBe(true);
    expect(shouldShowHoldingColumn("monex", "unitPrice10k")).toBe(false);
    expect(shouldShowHoldingColumn("ideco", "unitPrice10k")).toBe(true);
    expect(shouldShowHoldingColumn("ideco", "accountType")).toBe(false);
  });

  it("shows sbi-wrap holding columns without unit price", () => {
    expect(shouldShowHoldingColumn("sbi-wrap", "accountType")).toBe(true);
    expect(shouldShowHoldingColumn("sbi-wrap", "marketValue")).toBe(true);
    expect(shouldShowHoldingColumn("sbi-wrap", "weight")).toBe(true);
    expect(shouldShowHoldingColumn("sbi-wrap", "unitPrice")).toBe(false);
    expect(shouldShowHoldingColumn("sbi-wrap", "bookValue")).toBe(false);
  });

  it("returns default features and unit price metric code for unknown kind", () => {
    expect(getPortfolioKindFeatures("unknown").holdingLineColumns).toContain("instrumentName");
    expect(getHoldingUnitPriceMetricCode("ideco")).toBe("unit_price_per_10k_lots");
    expect(getHoldingUnitPriceMetricCode("monex")).toBe("unit_price_minor");
    expect(getHoldingUnitPriceMetricCode("unknown")).toBeNull();
  });
});
