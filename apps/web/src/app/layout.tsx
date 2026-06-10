import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

let result: Metadata = {
  title: "investment-portfolio",
  description: "投資ポートフォリオの管理・分析ツール",
};
export const metadata = result;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let result = (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
  return result;
}
