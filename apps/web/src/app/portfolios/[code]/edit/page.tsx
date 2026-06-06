import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function EditPlaceholderPage({ params }: PageProps) {
  let result = (
    <main>
      <h1>更新</h1>
      <p className="note">準備中です（明細・銘柄の更新・削除を今後実装予定）。</p>
    </main>
  );

  const { code } = await params;
  result = (
    <main>
      <h1>更新（{code}）</h1>
      <p className="note">準備中です（明細・銘柄の更新・削除を今後実装予定）。</p>
    </main>
  );
  return result;
}
