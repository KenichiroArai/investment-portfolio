import { redirect } from "next/navigation";

import { AnalysisSettingsView } from "@/features/manage/AnalysisSettingsView";
import { buildPortfolioPath, resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type ClassificationSettingsPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ClassificationSettingsPage({
  params,
  searchParams,
}: ClassificationSettingsPageProps) {
  const code = await resolvePortfolioCodeParam(params);
  const { tab } = await searchParams;
  const initialTab = tab ?? "scheme";
  const validTab = initialTab === "scheme" || initialTab === "value" || initialTab === "tag";

  if (!validTab) {
    let result: never = redirect(buildPortfolioPath(code, "settings", "classification")) as never;
    return result;
  }

  let result = <AnalysisSettingsView portfolioCode={code} initialTab={initialTab} />;
  return result;
}
