import type { ReactNode } from "react";

import { TopBar } from "@/components/layout/top-bar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  let result = (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-auto">
      <TopBar />
      <main className="min-w-0 w-full flex-1">{children}</main>
    </div>
  );
  return result;
}
