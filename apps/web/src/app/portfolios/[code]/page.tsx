import { PortfolioOverviewView } from "@/features/portfolio/PortfolioOverviewView";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioOverviewPage({ params }: PageProps) {
  let result = <PortfolioOverviewView portfolioCode="" />;

  const { code } = await params;
  result = <PortfolioOverviewView portfolioCode={code} />;
  return result;
}
