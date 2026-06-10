import { redirect } from "next/navigation";

type SettingsPageProps = {
  params: Promise<{ code: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { code } = await params;
  let result: never = redirect(`/portfolios/${code}/settings/data/`) as never;
  return result;
}
