export default function Home() {
  let result = (
    <main className="landing">
      <h1>investment-portfolio</h1>
      <p>
        投資ポートフォリオの管理・分析を行うためのツールです。株式・債券・現金などの資産を、口座単位で管理・可視化します。
      </p>
      <p className="note">
        v0.1.0 — ローカル開発時は API とあわせて起動し、メニューから口座明細を表示します。
      </p>
    </main>
  );
  return result;
}
