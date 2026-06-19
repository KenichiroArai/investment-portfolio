import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { WritableOnly } from "@/components/WritableOnly";
import { HomeView } from "@/features/home/HomeView";

export default function Home() {
  let result = (
    <PageContainer>
      <PageHeader
        title="investment-portfolio"
        description="投資ポートフォリオの管理・分析を行うためのツールです。株式・債券・現金などの資産を、口座単位で管理・可視化します。"
      />
      <HomeView />
      <WritableOnly>
        <p className="mt-8 text-sm text-muted-foreground">
          ローカル開発時は API とあわせて起動し、口座コンテキストから明細・分析を表示します。
        </p>
      </WritableOnly>
    </PageContainer>
  );
  return result;
}
