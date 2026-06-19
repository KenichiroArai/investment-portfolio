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
  const code = await resolvePortfolioCodeParam(params);

  let result = (
    <>
      <AnalysisSubNav portfolioCode={code} />
      {children}
    </>
  );
  return result;
}
