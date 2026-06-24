import { describe, expect, it } from "vitest";

import HoldingsPage, {
  generateStaticParams,
} from "@/app/portfolios/[code]/holdings/page";
import { LegacyPortfolioRouteRedirect } from "@/features/portfolio/LegacyPortfolioRouteRedirect";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { Suspense } from "react";

describe("HoldingsPage", () => {
  it("exposes static params for each portfolio", () => {
    expect(generateStaticParams()).toEqual(generatePortfolioStaticParams());
  });

  it("renders holdings redirect for portfolio code", async () => {
    const element = await HoldingsPage({
      params: Promise.resolve({ code: "ideco" }),
    });
    expect(element).toEqual(
      <Suspense fallback={null}>
        <LegacyPortfolioRouteRedirect portfolioCode="ideco" target="holdings" />
      </Suspense>,
    );
  });
});
