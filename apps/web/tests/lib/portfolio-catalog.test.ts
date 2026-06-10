import { describe, expect, it } from "vitest";

import {
  findPortfolioByCode,
  generatePortfolioStaticParams,
  STATIC_PORTFOLIOS,
} from "@/lib/portfolio-catalog";

describe("generatePortfolioStaticParams", () => {
  it("returns static params for each portfolio", () => {
    expect(generatePortfolioStaticParams()).toEqual(
      STATIC_PORTFOLIOS.map((portfolio) => ({ code: portfolio.code })),
    );
  });
});

describe("findPortfolioByCode", () => {
  it("returns portfolio when code exists", () => {
    expect(findPortfolioByCode("ideco")).toEqual(STATIC_PORTFOLIOS[0]);
  });

  it("returns null when code does not exist", () => {
    expect(findPortfolioByCode("unknown")).toBeNull();
  });
});
