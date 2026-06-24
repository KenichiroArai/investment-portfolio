import { Suspense } from "react";

import { LegacyPortfolioRouteRedirect } from "@/features/portfolio/LegacyPortfolioRouteRedirect";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function HoldingsPage({ params }: PageProps) {
  let result = (
    <Suspense fallback={null}>
      <LegacyPortfolioRouteRedirect portfolioCode="" target="holdings" />
    </Suspense>
  );

  const code = await resolvePortfolioCodeParam(params);
  result = (
    <Suspense fallback={null}>
      <LegacyPortfolioRouteRedirect portfolioCode={code} target="holdings" />
    </Suspense>
  );
  return result;
}
