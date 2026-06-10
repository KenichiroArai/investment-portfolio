import { redirect } from "next/navigation";

import { buildPortfolioPath, resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type SettingsPageProps = {
  params: Promise<{ code: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const code = await resolvePortfolioCodeParam(params);
  let result: never = redirect(buildPortfolioPath(code, "settings", "data")) as never;
  return result;
}
