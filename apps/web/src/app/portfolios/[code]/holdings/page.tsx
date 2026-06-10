import { HoldingsView } from "@/features/portfolio/HoldingsView";
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
  let result = <HoldingsView portfolioCode="" />;

  const code = await resolvePortfolioCodeParam(params);
  result = <HoldingsView portfolioCode={code} />;
  return result;
}
