import { RegisterView } from "@/features/manage/RegisterView";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function RegisterPage({ params }: PageProps) {
  const { code } = await params;
  let result = <RegisterView portfolioCode={code} />;
  return result;
}
