import type { Metadata } from "next";

import { AppNav } from "@/components/AppNav";
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
    <html lang="ja">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
  return result;
}
