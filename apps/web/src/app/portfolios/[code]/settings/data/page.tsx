import { DataManageView } from "@/features/manage/DataManageView";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type DataManagePageProps = {
  params: Promise<{ code: string }>;
};

export default async function DataManagePage({ params }: DataManagePageProps) {
  const code = await resolvePortfolioCodeParam(params);

  let result = <DataManageView portfolioCode={code} />;
  return result;
}
