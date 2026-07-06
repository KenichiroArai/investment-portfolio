import { describe, expect, it } from "vitest";

import {
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
});
