import { HoldingsView } from "@/features/portfolio/HoldingsView";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  const result = [{ code: "ideco" }];
  return result;
}

export default async function HoldingsPage({ params }: PageProps) {
  const { code } = await params;
  const result = <HoldingsView portfolioCode={code} />;
  return result;
}
