import { DataManageView } from "@/features/manage/DataManageView";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";
import { resolvePortfolioKind } from "@/lib/resolve-portfolio-kind";

type DataManagePageProps = {
  params: Promise<{ code: string }>;
};

export default async function DataManagePage({ params }: DataManagePageProps) {
  const code = await resolvePortfolioCodeParam(params);
  const portfolioKind = resolvePortfolioKind(code);

  let result = <DataManageView portfolioCode={code} portfolioKind={portfolioKind} />;
  return result;
}
