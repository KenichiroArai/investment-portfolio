import { PortfolioContextBar } from "@/components/PortfolioContextBar";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function PortfolioLayout({ children, params }: LayoutProps) {
  let result = (
    <>
      <PortfolioContextBar portfolioCode="" />
      {children}
    </>
  );

  const { code } = await params;
  result = (
    <>
      <PortfolioContextBar portfolioCode={code} />
      {children}
    </>
  );
  return result;
}
