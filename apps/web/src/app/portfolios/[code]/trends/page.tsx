import { TrendsView } from "@/features/trends/TrendsView";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TrendsPage({ params }: PageProps) {
  let result = <TrendsView portfolioCode="" />;

  const code = await resolvePortfolioCodeParam(params);
  result = <TrendsView portfolioCode={code} />;
  return result;
}
