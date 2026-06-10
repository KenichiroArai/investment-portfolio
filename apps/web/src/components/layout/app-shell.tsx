import type { ReactNode } from "react";

import { TopBar } from "@/components/layout/top-bar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  let result = (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex-1">{children}</main>
    </div>
  );
  return result;
}
