import { redirect } from "next/navigation";

import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function AnalysisSettingsPage({ params }: PageProps) {
  const { code } = await params;
  let result: never = redirect(`/portfolios/${code}/settings/classification/`) as never;
  return result;
}
