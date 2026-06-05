import { HoldingsView } from "@/features/portfolio/HoldingsView";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = [{ code: "ideco" }];
  return result;
}

export default async function HoldingsPage({ params }: PageProps) {
  let result = <HoldingsView portfolioCode="" />;

  const { code } = await params;
  result = <HoldingsView portfolioCode={code} />;
  return result;
}
