"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { findPortfolioByCode } from "@/lib/portfolio-catalog";
import {
  getPortfoliosFetchUrl,
  getSnapshotLoadErrorMessage,
  type PortfolioListItem,
} from "@/lib/data-source";

type PortfolioContextBarProps = {
  portfolioCode: string;
};

type ContextTab = {
  segment: string;
  label: string;
  enabled: boolean;
};

const CONTEXT_TABS: ContextTab[] = [
  { segment: "", label: "概要", enabled: true },
  { segment: "holdings", label: "明細", enabled: true },
  { segment: "analysis", label: "分析", enabled: true },
  { segment: "trends", label: "推移", enabled: true },
  { segment: "register", label: "登録", enabled: true },
  { segment: "edit", label: "更新", enabled: true },
];

function buildPortfolioHref(portfolioCode: string, segment: string): string {
  let result = `/portfolios/${portfolioCode}/`;

  if (segment !== "") {
    result = `${result}${segment}/`;
  }

  return result;
}

function isTabActive(pathname: string, portfolioCode: string, segment: string): boolean {
  let result = false;
  const base = `/portfolios/${portfolioCode}`;

  if (segment === "") {
    result = pathname === base || pathname === `${base}/`;
    return result;
  }

  if (segment === "analysis") {
    result = pathname.startsWith(`${base}/analysis`);
    return result;
  }

  if (segment === "trends") {
    result = pathname.startsWith(`${base}/trends`);
    return result;
  }

  result = pathname.startsWith(`${base}/${segment}`);
  return result;
}

export function PortfolioContextBar({ portfolioCode }: PortfolioContextBarProps) {
  const pathname = usePathname();
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const catalogPortfolio = findPortfolioByCode(portfolioCode);
  const [portfolioName, setPortfolioName] = useState(
    catalogPortfolio?.name ?? portfolioCode,
  );

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function load() {
      let result: void = undefined;

      try {
        const response = await fetch(getPortfoliosFetchUrl());
        if (cancelled) {
          return result;
        }
        if (!response.ok) {
          return result;
        }
        const data = (await response.json()) as PortfolioListItem[];
        setPortfolios(data);
        const current = data.find((item) => item.code === portfolioCode);
        if (current) {
          setPortfolioName(current.name);
        }
      } catch {
        if (!cancelled) {
          void getSnapshotLoadErrorMessage();
        }
      }

      return result;
    }

    void load();

    result = () => {
      cancelled = true;
    };
    return result;
  }, [portfolioCode]);

  let result = (
    <div className="portfolio-context">
      <div className="portfolio-context__header">
        {portfolios.length > 1 ? (
          <label className="portfolio-context__selector">
            <span className="visually-hidden">口座を選択</span>
            <select
              className="portfolio-context__select"
              value={portfolioCode}
              onChange={(event) => {
                const nextCode = event.target.value;
                window.location.assign(buildPortfolioHref(nextCode, ""));
              }}
            >
              {portfolios.map((portfolio) => {
                let option = (
                  <option key={portfolio.code} value={portfolio.code}>
                    {portfolio.name}
                  </option>
                );
                return option;
              })}
            </select>
          </label>
        ) : (
          <span className="portfolio-context__title">{portfolioName}</span>
        )}
      </div>
      <nav className="portfolio-context__tabs" aria-label="口座メニュー">
        <ul>
          {CONTEXT_TABS.map((tab) => {
            let tabResult: ReactNode = null;
            const href = buildPortfolioHref(portfolioCode, tab.segment);
            const active = isTabActive(pathname, portfolioCode, tab.segment);

            if (!tab.enabled) {
              tabResult = (
                <li key={tab.segment}>
                  <span className="portfolio-context__disabled" title="準備中">
                    {tab.label}
                  </span>
                </li>
              );
              return tabResult;
            }

            tabResult = (
              <li key={tab.segment}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={active ? "is-active" : undefined}
                >
                  {tab.label}
                </Link>
              </li>
            );
            return tabResult;
          })}
        </ul>
      </nav>
    </div>
  );
  return result;
}
