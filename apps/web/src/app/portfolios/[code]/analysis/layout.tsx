import { AnalysisSubNav } from "@/components/AnalysisSubNav";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
};

export default async function PortfolioAnalysisLayout({
  children,
  params,
}: LayoutProps) {
  let result = (
    <>
      <AnalysisSubNav portfolioCode="" />
      {children}
    </>
  );

  const code = await resolvePortfolioCodeParam(params);
  result = (
    <>
      <AnalysisSubNav portfolioCode={code} />
      {children}
    </>
  );
  return result;
}
