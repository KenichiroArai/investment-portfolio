import { AnalysisSettingsView } from "@/features/manage/AnalysisSettingsView";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type ClassificationSettingsPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ClassificationSettingsPage({
  params,
}: ClassificationSettingsPageProps) {
  const code = await resolvePortfolioCodeParam(params);

  let result = <AnalysisSettingsView portfolioCode={code} />;
  return result;
}
