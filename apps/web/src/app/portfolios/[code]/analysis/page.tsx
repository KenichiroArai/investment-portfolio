import { AnalysisView } from "@/features/analysis/AnalysisView";
import { findPortfolioByCode, generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioAnalysisPage({ params }: PageProps) {
  let result = <AnalysisView portfolioCode="" portfolioKind="ideco" />;

  const code = await resolvePortfolioCodeParam(params);
  const portfolio = findPortfolioByCode(code);
  const kind = portfolio?.kind ?? "ideco";
  result = <AnalysisView portfolioCode={code} portfolioKind={kind} />;
  return result;
}
