import Link from "next/link";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  enabled: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "ホーム", enabled: true },
  { href: "/analysis/", label: "全口座の資産配分", enabled: true },
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
