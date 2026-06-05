import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  enabled: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "ホーム", enabled: true },
  {
    href: "/portfolios/ideco/holdings/",
    label: "口座明細（iDeCo）",
    enabled: true,
  },
  {
    href: "/portfolios/ideco/register/",
    label: "登録",
    enabled: false,
  },
  {
    href: "/portfolios/ideco/edit/",
    label: "更新",
    enabled: false,
  },
  { href: "/analysis/", label: "分析", enabled: false },
];

export function AppNav() {
  let result = (
    <nav className="app-nav" aria-label="メインメニュー">
      <ul>
        {navItems.map((item) => {
          let result: ReactNode = null;

          if (!item.enabled) {
            result = (
              <li key={item.href}>
                <span className="app-nav__disabled" title="準備中">
                  {item.label}
                </span>
              </li>
            );
            return result;
          }

          result = (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          );
          return result;
        })}
      </ul>
    </nav>
  );
  return result;
}
