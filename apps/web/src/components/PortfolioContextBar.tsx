"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { findPortfolioByCode } from "@/lib/portfolio-catalog";
import { buildPortfolioPath } from "@/lib/portfolio-path";
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
  { segment: "analysis", label: "資産配分", enabled: true },
  { segment: "trends", label: "推移", enabled: true },
];

function buildPortfolioHref(portfolioCode: string, segment: string): string {
  let result = buildPortfolioPath(portfolioCode, segment);
  return result;
}

function isTabActive(pathname: string, portfolioCode: string, segment: string): boolean {
  let result = false;
  const base = `/portfolios/${portfolioCode}`;

  if (pathname.startsWith(`${base}/settings`)) {
    return result;
  }

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

function isSettingsActive(pathname: string, portfolioCode: string): boolean {
  let result = pathname.startsWith(`/portfolios/${portfolioCode}/settings`);
  return result;
}

export function PortfolioContextBar({ portfolioCode }: PortfolioContextBarProps) {
  const pathname = usePathname();
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const catalogPortfolio = findPortfolioByCode(portfolioCode);
  const [portfolioName, setPortfolioName] = useState(
    catalogPortfolio?.name ?? portfolioCode,
  );
  const settingsActive = isSettingsActive(pathname, portfolioCode);

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
    <div className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {portfolios.length > 1 ? (
              <Select
                value={portfolioCode}
                onValueChange={(nextCode) => {
                  window.location.assign(buildPortfolioHref(nextCode, ""));
                }}
              >
                <SelectTrigger className="w-[min(100%,14rem)]" aria-label="口座を選択">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((portfolio) => {
                    let item = (
                      <SelectItem key={portfolio.code} value={portfolio.code}>
                        {portfolio.name}
                      </SelectItem>
                    );
                    return item;
                  })}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm font-semibold">{portfolioName}</span>
            )}
          </div>
          <Button
            variant={settingsActive ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link href={buildPortfolioPath(portfolioCode, "settings", "data")}>
              <Settings className="h-4 w-4" />
              設定
            </Link>
          </Button>
        </div>
        {!settingsActive ? (
          <nav aria-label="口座メニュー" className="-mb-px flex gap-1 overflow-x-auto pb-0">
            {CONTEXT_TABS.map((tab) => {
              let tabResult: ReactNode = null;
              const href = buildPortfolioHref(portfolioCode, tab.segment);
              const active = isTabActive(pathname, portfolioCode, tab.segment);

              if (!tab.enabled) {
                tabResult = (
                  <span
                    key={tab.segment}
                    className="shrink-0 px-3 py-2 text-sm text-muted-foreground"
                    title="準備中"
                  >
                    {tab.label}
                  </span>
                );
                return tabResult;
              }

              tabResult = (
                <Link
                  key={tab.segment}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
              return tabResult;
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
  return result;
}
