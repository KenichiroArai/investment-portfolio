import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "investment-portfolio",
  description: "投資ポートフォリオの管理・分析ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
