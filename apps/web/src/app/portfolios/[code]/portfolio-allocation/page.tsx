import { PortfolioAllocationView } from "@/features/portfolio-allocation/PortfolioAllocationView";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioAllocationPage({ params }: PageProps) {
  let result = <PortfolioAllocationView portfolioCode="" />;

  const code = await resolvePortfolioCodeParam(params);
  result = <PortfolioAllocationView portfolioCode={code} />;
  return result;
}
