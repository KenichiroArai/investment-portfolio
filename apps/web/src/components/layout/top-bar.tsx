"use client";

import { BarChart3, Home, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/analysis/", label: "全口座分析", icon: BarChart3 },
];

export function TopBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  let result = (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Portfolio
          </Link>
          <nav aria-label="メインメニュー" className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/" || pathname === ""
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              let link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border border-border bg-surface text-foreground"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
              return link;
            })}
          </nav>
        </div>
        {isClient ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setTheme(theme === "dark" ? "light" : "dark");
            }}
            aria-label="テーマ切替"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="テーマ切替" disabled>
            <Moon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
  return result;
}
