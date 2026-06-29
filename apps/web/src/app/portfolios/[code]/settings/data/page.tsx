import { DataManageView } from "@/features/manage/DataManageView";
import { findPortfolioByCode } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type DataManagePageProps = {
  params: Promise<{ code: string }>;
};

export default async function DataManagePage({ params }: DataManagePageProps) {
  const code = await resolvePortfolioCodeParam(params);
  const portfolioKind = findPortfolioByCode(code)?.kind;

  let result = <DataManageView portfolioCode={code} portfolioKind={portfolioKind} />;
  return result;
}
