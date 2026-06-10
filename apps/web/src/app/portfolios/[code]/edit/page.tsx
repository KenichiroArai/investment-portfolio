import { redirect } from "next/navigation";

type EditPageProps = {
  params: Promise<{ code: string }>;
};

export default async function EditPage({ params }: EditPageProps) {
  const { code } = await params;
  let result: never = redirect(`/portfolios/${code}/settings/data/`) as never;
  return result;
}
