import { generatePortfolioStaticParams } from "@/lib/portfolio-catalog";

type PageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  let result = generatePortfolioStaticParams();
  return result;
}

export default async function RegisterPlaceholderPage({ params }: PageProps) {
  let result = (
    <main>
      <h1>登録</h1>
      <p className="note">準備中です（明細・銘柄の登録を今後実装予定）。</p>
    </main>
  );

  const { code } = await params;
  result = (
    <main>
      <h1>登録（{code}）</h1>
      <p className="note">準備中です（明細・銘柄の登録を今後実装予定）。</p>
    </main>
  );
  return result;
}
