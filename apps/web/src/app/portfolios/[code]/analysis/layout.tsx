import { AnalysisSubNav } from "@/components/AnalysisSubNav";

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

  const { code } = await params;
  result = (
    <>
      <AnalysisSubNav portfolioCode={code} />
      {children}
    </>
  );
  return result;
}
