import { DataManageView } from "@/features/manage/DataManageView";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type SettingsPageProps = {
  params: Promise<{ code: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const code = await resolvePortfolioCodeParam(params);

  let result = <DataManageView portfolioCode={code} />;
  return result;
}
