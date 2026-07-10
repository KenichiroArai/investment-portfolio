"use client";

import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { WritableOnly } from "@/components/WritableOnly";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SETTINGS_CATEGORIES,
  resolveActiveCategory,
  resolveSettingsViewMode,
} from "@/lib/settings-navigation";
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
  { segment: "portfolio-allocation", label: "ポートフォリオ配分", enabled: true },
  { segment: "analysis", label: "資産配分", enabled: true },
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

  if (segment === "portfolio-allocation") {
    result = pathname.startsWith(`${base}/portfolio-allocation`);
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
  const router = useRouter();
  const [portfolios, setPortfolios] = useState<PortfolioListItem[]>([]);
  const catalogPortfolio = findPortfolioByCode(portfolioCode);
  const [portfolioName, setPortfolioName] = useState(
    catalogPortfolio?.name ?? portfolioCode,
  );
  const settingsActive = isSettingsActive(pathname, portfolioCode);
  const activeSettingsCategory = resolveActiveCategory(pathname);
  const settingsViewMode = resolveSettingsViewMode(pathname);

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
    <div className="border-b bg-card">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {portfolios.length > 1 ? (
              <Select
                value={portfolioCode}
                onValueChange={(nextCode) => {
                  router.push(buildPortfolioHref(nextCode, ""));
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
          <WritableOnly>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={settingsActive ? "secondary" : "outline"} size="sm">
                  <Settings className="h-4 w-4" />
                  設定
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {SETTINGS_CATEGORIES.map((category) => {
                  const active =
                    activeSettingsCategory === category.segment && settingsViewMode === "category";
                  let item = (
                    <DropdownMenuItem
                      key={category.segment}
                      onSelect={() => {
                        router.push(buildPortfolioPath(portfolioCode, "settings", category.segment));
                      }}
                      className="flex items-start gap-2 py-2"
                    >
                      <category.icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {category.label}
                          {active ? " (現在)" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">{category.description}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                  return item;
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    router.push(buildPortfolioPath(portfolioCode, "settings"));
                  }}
                >
                  設定一覧
                  {settingsViewMode === "overview" ? " (現在)" : ""}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </WritableOnly>
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
                      ? "border-primary bg-surface text-foreground"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:bg-surface/60 hover:text-foreground",
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
