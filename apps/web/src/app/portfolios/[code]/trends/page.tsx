import { Suspense } from "react";

import { LegacyPortfolioRouteRedirect } from "@/features/portfolio/LegacyPortfolioRouteRedirect";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TrendsPage({ params }: PageProps) {
  let result = (
    <Suspense fallback={null}>
      <LegacyPortfolioRouteRedirect portfolioCode="" target="trends" />
    </Suspense>
  );

  const code = await resolvePortfolioCodeParam(params);
  result = (
    <Suspense fallback={null}>
      <LegacyPortfolioRouteRedirect portfolioCode={code} target="trends" />
    </Suspense>
  );
  return result;
}
