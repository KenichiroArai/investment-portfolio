import { AnalysisSettingsView } from "@/features/manage/AnalysisSettingsView";
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
  let result = <AnalysisSettingsView portfolioCode={code} />;
  return result;
}
