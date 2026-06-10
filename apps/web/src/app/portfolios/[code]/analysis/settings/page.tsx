import { redirect } from "next/navigation";

import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { buildPortfolioPath, resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function AnalysisSettingsPage({ params }: PageProps) {
  const code = await resolvePortfolioCodeParam(params);
  let result: never = redirect(
    buildPortfolioPath(code, "settings", "classification"),
  ) as never;
  return result;
}
