import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SettingsSidebar } from "@/components/layout/settings-sidebar";
import { isWritableDataSource } from "@/lib/data-source";
import { buildPortfolioPath, resolvePortfolioCodeParam } from "@/lib/portfolio-path";
import { resolvePortfolioKind } from "@/lib/resolve-portfolio-kind";

type SettingsLayoutProps = {
  children: ReactNode;
  params: Promise<{ code: string }>;
};

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const code = await resolvePortfolioCodeParam(params);
  const portfolioKind = resolvePortfolioKind(code);

  if (!isWritableDataSource()) {
    let result: never = redirect(buildPortfolioPath(code)) as never;
    return result;
  }

  let result = (
    <PageContainer>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <SettingsSidebar portfolioCode={code} portfolioKind={portfolioKind} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageContainer>
  );
  return result;
}
