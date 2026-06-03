import type { Metadata } from "next";
import "./globals.css";

const result: Metadata = {
  title: "investment-portfolio",
  description: "投資ポートフォリオの管理・分析ツール",
};
export const metadata = result;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const result = (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
  return result;
}
