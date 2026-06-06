import Link from "next/link";

import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function AnalysisSettingsPlaceholderPage({
  params,
}: PageProps) {
  const { code } = await params;
  let result = (
    <main>
      <h1>分析設定（{code}）</h1>
      <p className="note">
        準備中です（v0.3 以降で分類軸・導出ルールの登録・更新・削除を実装予定）。
      </p>
      <p>
        <Link href={`/portfolios/${code}/analysis/`}>分析表示へ戻る</Link>
      </p>
    </main>
  );

  return result;
}
