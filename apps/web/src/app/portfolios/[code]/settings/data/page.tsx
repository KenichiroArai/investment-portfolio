import { DataManageView } from "@/features/manage/DataManageView";

type DataManagePageProps = {
  params: Promise<{ code: string }>;
};

export default async function DataManagePage({ params }: DataManagePageProps) {
  const { code } = await params;

  let result = <DataManageView portfolioCode={code} />;
  return result;
}
