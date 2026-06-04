import { getApiBaseUrl } from "@/lib/api-base";

export type DataSource = "api" | "static";

export function getDataSource(): DataSource {
  const raw = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (raw === "static" || raw === "api") {
    const result: DataSource = raw;
    return result;
  }
  const result: DataSource = "api";
  return result;
}

export function getBasePath(): string {
  const result = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return result;
}

export function getSnapshotFetchUrl(portfolioCode: string): string {
  const source = getDataSource();
  if (source === "static") {
    const basePath = getBasePath();
    const prefix = basePath.endsWith("/")
      ? basePath.slice(0, -1)
      : basePath;
    const result = `${prefix}/data/portfolios/${portfolioCode}/current.json`;
    return result;
  }
  const result = `${getApiBaseUrl()}/portfolios/${portfolioCode}/snapshot/current`;
  return result;
}

export function getSnapshotLoadErrorMessage(): string {
  const source = getDataSource();
  if (source === "static") {
    const result =
      "公開データを読み込めません。`npm run pages:export` で docs/data を更新し、コミットして push してください。";
    return result;
  }
  const result =
    "API に接続できません。`npm run dev:api` でローカル API を起動してください。";
  return result;
}
