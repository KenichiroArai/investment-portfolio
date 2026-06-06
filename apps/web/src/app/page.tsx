import { HomeView } from "@/features/home/HomeView";

export default function Home() {
  let result = (
    <main className="landing">
      <h1>investment-portfolio</h1>
      <p>
        投資ポートフォリオの管理・分析を行うためのツールです。株式・債券・現金などの資産を、口座単位で管理・可視化します。
      </p>
      <HomeView />
      <p className="note">
        ローカル開発時は API とあわせて起動し、口座コンテキストから明細・分析を表示します。
      </p>
    </main>
  );
  return result;
}
