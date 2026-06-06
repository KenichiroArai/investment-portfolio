"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AnalysisSubNavProps = {
  portfolioCode: string;
};

export function AnalysisSubNav({ portfolioCode }: AnalysisSubNavProps) {
  const pathname = usePathname();
  const viewHref = `/portfolios/${portfolioCode}/analysis/`;
  const settingsHref = `/portfolios/${portfolioCode}/analysis/settings/`;
  const viewActive =
    pathname === `/portfolios/${portfolioCode}/analysis` ||
    pathname === viewHref;
  const settingsActive = pathname.startsWith(settingsHref);

  let result = (
    <nav className="analysis-subnav" aria-label="分析メニュー">
      <ul>
        <li>
          <Link href={viewHref} aria-current={viewActive ? "page" : undefined}>
            表示
          </Link>
        </li>
        <li>
          <Link
            href={settingsHref}
            aria-current={settingsActive ? "page" : undefined}
            className={settingsActive ? "is-active" : undefined}
          >
            設定
          </Link>
        </li>
      </ul>
    </nav>
  );
  return result;
}
