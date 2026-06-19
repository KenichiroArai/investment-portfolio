import { redirect } from "next/navigation";

import { AnalysisSubNav } from "@/components/AnalysisSubNav";
import { isWritableDataSource } from "@/lib/data-source";
import { buildPortfolioPath, resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
};

export default async function PortfolioAnalysisLayout({
  children,
  params,
}: LayoutProps) {
  const code = await resolvePortfolioCodeParam(params);

  if (!isWritableDataSource()) {
    let result: never = redirect(buildPortfolioPath(code)) as never;
    return result;
  }

  let result = (
    <>
      <AnalysisSubNav portfolioCode={code} />
      {children}
    </>
  );
  return result;
}
