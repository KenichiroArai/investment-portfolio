import { PortfolioShell } from "@/features/portfolio/PortfolioShell";
import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

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
    <PortfolioShell portfolioCode="">
      {children}
    </PortfolioShell>
  );

  const code = await resolvePortfolioCodeParam(params);
  result = (
    <PortfolioShell portfolioCode={code}>
      {children}
    </PortfolioShell>
  );
  return result;
}
