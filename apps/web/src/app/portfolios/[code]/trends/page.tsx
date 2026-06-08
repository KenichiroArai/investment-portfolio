import { TrendsView } from "@/features/trends/TrendsView";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function TrendsPage({ params }: PageProps) {
  let result = <TrendsView portfolioCode="" />;

  const { code } = await params;
  result = <TrendsView portfolioCode={code} />;
  return result;
}
