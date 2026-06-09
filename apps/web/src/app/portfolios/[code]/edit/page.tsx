import { EditView } from "@/features/manage/EditView";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function EditPage({ params }: PageProps) {
  const { code } = await params;
  let result = <EditView portfolioCode={code} />;
  return result;
}
