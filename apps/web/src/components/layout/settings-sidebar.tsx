"use client";

import { Database, Tags } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buildPortfolioPath } from "@/lib/portfolio-path";
import { cn } from "@/lib/utils";

type SettingsSidebarProps = {
  portfolioCode: string;
};

const SETTINGS_ITEMS = [
  {
    segment: "data",
    label: "データ管理",
    description: "銘柄・明細・指標",
    icon: Database,
  },
  {
    segment: "classification",
    label: "分類設定",
    description: "分析軸・タグ",
    icon: Tags,
  },
];

function SettingsNavLinks({
  portfolioCode,
  pathname,
  onNavigate,
}: {
  portfolioCode: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  let result = (
    <nav className="grid gap-1" aria-label="設定メニュー">
      {SETTINGS_ITEMS.map((item) => {
        const href = buildPortfolioPath(portfolioCode, "settings", item.segment);
        const active = pathname.startsWith(href);
        const Icon = item.icon;

        let link = (
          <Link
            key={item.segment}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block font-medium">{item.label}</span>
              <span className="block text-xs opacity-80">{item.description}</span>
            </span>
          </Link>
        );
        return link;
      })}
    </nav>
  );
  return result;
}

export function SettingsSidebar({ portfolioCode }: SettingsSidebarProps) {
  const pathname = usePathname();

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
              <SheetTitle>設定</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <SettingsNavLinks portfolioCode={portfolioCode} pathname={pathname} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <aside className="hidden w-56 shrink-0 md:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          設定
        </p>
        <SettingsNavLinks portfolioCode={portfolioCode} pathname={pathname} />
      </aside>
    </>
  );
  return result;
}
