import { redirect } from "next/navigation";

import { DataManageView } from "@/features/manage/DataManageView";
import { buildPortfolioPath, resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type SettingsPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsPage({ params, searchParams }: SettingsPageProps) {
  const code = await resolvePortfolioCodeParam(params);
  const { tab } = await searchParams;
  const initialTab = tab ?? "instrument";
  const validTab = initialTab === "instrument" || initialTab === "holding" || initialTab === "generic";

  if (!validTab) {
    let result: never = redirect(buildPortfolioPath(code, "settings")) as never;
    return result;
  }

  let result = <DataManageView portfolioCode={code} initialTab={initialTab} />;
  return result;
}
