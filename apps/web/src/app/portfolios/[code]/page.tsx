import { PortfolioOverviewView } from "@/features/portfolio/PortfolioOverviewView";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioOverviewPage({ params }: PageProps) {
  let result = <PortfolioOverviewView portfolioCode="" />;

  const code = await resolvePortfolioCodeParam(params);
  result = <PortfolioOverviewView portfolioCode={code} />;
  return result;
}
