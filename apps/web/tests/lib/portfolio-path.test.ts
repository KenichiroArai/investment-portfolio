import { describe, expect, it } from "vitest";

import {
  buildPortfolioPath,
  decodePortfolioCodeFromPath,
  encodePortfolioCodeForPath,
} from "@/lib/portfolio-path";

describe("portfolio-path", () => {
  it("decodes percent-encoded portfolio codes from URL segments", () => {
    expect(decodePortfolioCodeFromPath("%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E3%82%B3%E3%83%BC%E3%83%89")).toBe(
      "サンプルコード",
    );
  });

  it("leaves plain ASCII codes unchanged", () => {
    expect(decodePortfolioCodeFromPath("ideco")).toBe("ideco");
  });

  it("encodes non-ASCII codes for URL paths", () => {
    expect(encodePortfolioCodeForPath("サンプルコード")).toBe(
      "%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E3%82%B3%E3%83%BC%E3%83%89",
    );
  });

  it("builds portfolio paths with decoded codes for app routing", () => {
    expect(buildPortfolioPath("サンプルコード")).toBe("/portfolios/サンプルコード/");
    expect(buildPortfolioPath("ideco", "holdings")).toBe("/portfolios/ideco/holdings/");
  });
});
