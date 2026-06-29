"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buildPortfolioPath } from "@/lib/portfolio-path";
import {
  buildSettingsCategories,
  type SettingsCategory,
  type SettingsSubItem,
  resolveActiveCategory,
  resolveSettingsViewMode,
} from "@/lib/settings-navigation";
import { cn } from "@/lib/utils";

type SettingsSidebarProps = {
  portfolioCode: string;
  portfolioKind: string;
};

function buildSettingsSubItemHref(
  portfolioCode: string,
  category: SettingsCategory,
  item: SettingsSubItem,
): string {
  let result = buildPortfolioPath(portfolioCode, "settings", category.segment);

  if (item.tab) {
    result = `${result}?tab=${item.tab}`;
    return result;
  }

  return result;
}

function isSubItemActive(
  pathname: string,
  queryTab: string,
  category: SettingsCategory,
  item: SettingsSubItem,
): boolean {
  let result = false;

  if (category.segment === "data") {
    if (!pathname.includes("/settings/data")) {
      return result;
    }

    result = queryTab === "" ? item.tab === "instrument" : queryTab === item.tab;
    return result;
  }

  if (category.segment === "classification") {
    if (!pathname.includes("/settings/classification")) {
      return result;
    }
    result = queryTab === "" ? item.tab === "scheme" : queryTab === item.tab;
  }

  return result;
}

function SettingsNavLinks({
  portfolioCode,
  portfolioKind,
  pathname,
  queryTab,
  mode,
  activeCategory,
  onNavigate,
}: {
  portfolioCode: string;
  portfolioKind: string;
  pathname: string;
  queryTab: string;
  mode: "category" | "overview";
  activeCategory: SettingsCategory["segment"] | undefined;
  onNavigate?: () => void;
}) {
  const categories =
    mode === "category" && activeCategory
      ? buildSettingsCategories(portfolioKind).filter(
          (category) => category.segment === activeCategory,
        )
      : buildSettingsCategories(portfolioKind);

  let result = (
    <nav className="grid gap-1" aria-label="設定メニュー">
      {categories.map((category) => {
        let group = (
          <div key={category.segment} className="grid gap-1">
            {mode === "overview" ? (
              <>
                <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">{category.label}</p>
                <p className="px-3 text-xs text-muted-foreground">{category.description}</p>
              </>
            ) : null}
            {category.children.map((child) => {
              const href = buildSettingsSubItemHref(portfolioCode, category, child);
              const active = isSubItemActive(pathname, queryTab, category, child);

              let childLink = (
                <Link
                  key={child.id}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-start rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="block">
                    <span className="block font-medium">{child.label}</span>
                    {mode === "overview" ? (
                      <span className="block text-xs opacity-80">{category.label}</span>
                    ) : null}
                  </span>
                </Link>
              );
              return childLink;
            })}
            {mode === "overview" ? <Separator className="my-2" /> : null}
          </div>
        );
        return group;
      })}
    </nav>
  );
  return result;
}

export function SettingsSidebar({ portfolioCode, portfolioKind }: SettingsSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = resolveSettingsViewMode(pathname);
  const activeCategory = resolveActiveCategory(pathname);
  const queryTab = searchParams.get("tab") ?? "";
  const settingsCategories = buildSettingsCategories(portfolioKind);
  const desktopTitle =
    mode === "category"
      ? settingsCategories.find((category) => category.segment === activeCategory)?.label ?? "設定"
      : "設定一覧";
  const overviewHref = buildPortfolioPath(portfolioCode, "settings");

  let result = (
    <>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="mb-4">
              設定メニュー
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>{desktopTitle}</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {mode === "category" ? (
                <Link
                  href={overviewHref}
                  className="mb-3 inline-flex px-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  設定一覧へ
                </Link>
              ) : null}
              <SettingsNavLinks
                portfolioCode={portfolioCode}
                portfolioKind={portfolioKind}
                pathname={pathname}
                queryTab={queryTab}
                mode={mode}
                activeCategory={activeCategory}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <aside className="hidden w-56 shrink-0 md:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {desktopTitle}
        </p>
        {mode === "category" ? (
          <Link
            href={overviewHref}
            className="mb-3 inline-flex px-1 text-xs text-muted-foreground hover:text-foreground"
          >
            設定一覧へ
          </Link>
        ) : null}
        <SettingsNavLinks
          portfolioCode={portfolioCode}
          portfolioKind={portfolioKind}
          pathname={pathname}
          queryTab={queryTab}
          mode={mode}
          activeCategory={activeCategory}
        />
      </aside>
    </>
  );
  return result;
}
