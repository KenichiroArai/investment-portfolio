import { RebalanceView } from "@/features/rebalance/RebalanceView";
import { findPortfolioByCode, generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioRebalancePage({ params }: PageProps) {
  let result = <RebalanceView portfolioCode="" portfolioKind="ideco" />;

  const code = await resolvePortfolioCodeParam(params);
  const portfolio = findPortfolioByCode(code);
  const kind = portfolio?.kind ?? "ideco";
  result = <RebalanceView portfolioCode={code} portfolioKind={kind} />;
  return result;
}
