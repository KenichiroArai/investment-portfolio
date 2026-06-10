import { AnalysisSettingsView } from "@/features/manage/AnalysisSettingsView";

type ClassificationSettingsPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ClassificationSettingsPage({
  params,
}: ClassificationSettingsPageProps) {
  const { code } = await params;

  let result = <AnalysisSettingsView portfolioCode={code} />;
  return result;
}
