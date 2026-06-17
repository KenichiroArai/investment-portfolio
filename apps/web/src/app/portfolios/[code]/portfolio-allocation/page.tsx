import { PortfolioAllocationView } from "@/features/portfolio-allocation/PortfolioAllocationView";
import { findPortfolioByCode, generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioAllocationPage({ params }: PageProps) {
  let result = <PortfolioAllocationView portfolioCode="" portfolioKind="ideco" />;

  const code = await resolvePortfolioCodeParam(params);
  const portfolio = findPortfolioByCode(code);
  const kind = portfolio?.kind ?? "ideco";
  result = <PortfolioAllocationView portfolioCode={code} portfolioKind={kind} />;
  return result;
}
