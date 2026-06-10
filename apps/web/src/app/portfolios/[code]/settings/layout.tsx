import type { ReactNode } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SettingsSidebar } from "@/components/layout/settings-sidebar";
import { resolvePortfolioCodeParam } from "@/lib/portfolio-path";

type SettingsLayoutProps = {
  children: ReactNode;
  params: Promise<{ code: string }>;
};

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
  const code = await resolvePortfolioCodeParam(params);

  let result = (
    <PageContainer>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <SettingsSidebar portfolioCode={code} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageContainer>
  );
  return result;
}
