"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildPortfolioPath } from "@/lib/portfolio-path";
import { cn } from "@/lib/utils";

type AnalysisSubNavProps = {
  portfolioCode: string;
};

export function AnalysisSubNav({ portfolioCode }: AnalysisSubNavProps) {
  const pathname = usePathname();
  const viewHref = buildPortfolioPath(portfolioCode, "analysis");
  const settingsHref = buildPortfolioPath(portfolioCode, "settings", "classification");
  const analysisBase = buildPortfolioPath(portfolioCode, "analysis").replace(/\/$/, "");
  const viewActive = pathname === analysisBase || pathname === viewHref;
  const settingsActive = pathname.startsWith(settingsHref);

  let result = (
    <nav
      aria-label="分析メニュー"
      className="mx-auto flex max-w-6xl gap-1 border-b px-4 md:px-6"
    >
      <Link
        href={viewHref}
        aria-current={viewActive ? "page" : undefined}
        className={cn(
          "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          viewActive
            ? "border-primary bg-surface text-foreground"
            : "border-transparent text-muted-foreground hover:bg-surface/60 hover:text-foreground",
        )}
      >
        表示
      </Link>
      <Link
        href={settingsHref}
        aria-current={settingsActive ? "page" : undefined}
        className={cn(
          "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          settingsActive
            ? "border-primary bg-surface text-foreground"
            : "border-transparent text-muted-foreground hover:bg-surface/60 hover:text-foreground",
        )}
      >
        分類設定
      </Link>
    </nav>
  );
  return result;
}
