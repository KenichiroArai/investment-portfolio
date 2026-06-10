import { redirect } from "next/navigation";

type RegisterPageProps = {
  params: Promise<{ code: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { code } = await params;
  let result: never = redirect(`/portfolios/${code}/settings/data/`) as never;
  return result;
}
