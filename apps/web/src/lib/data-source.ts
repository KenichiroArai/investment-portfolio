import { getApiBaseUrl } from "@/lib/api-base";
import { encodePortfolioCodeForPath } from "@/lib/portfolio-path";

export type DataSource = "api" | "static";

export const WRITABLE_BLOCKED_MESSAGE =
  "編集はローカル開発環境（API 接続時）のみ利用できます。";

export type PortfolioListItem = {
  id: string;
  code: string;
  name: string;
  kind: string;
};

export function getDataSource(): DataSource {
  let result: DataSource = "api";

  const raw = process.env.NEXT_PUBLIC_DATA_SOURCE;
  if (raw === "static" || raw === "api") {
    result = raw;
    return result;
  }

  return result;
}

export function isWritableDataSource(): boolean {
  let result = getDataSource() === "api";
  return result;
}

export function getBasePath(): string {
  let result = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return result;
}

function getStaticDataPrefix(): string {
  let result = "";
  const basePath = getBasePath();
  result = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  return result;
}

export function getSnapshotFetchUrl(portfolioCode: string): string {
  let result = "";
  const encodedCode = encodePortfolioCodeForPath(portfolioCode);

  const source = getDataSource();
  if (source === "static") {
    result = `${getStaticDataPrefix()}/data/portfolios/${encodedCode}/current.json`;
    return result;
  }

  result = `${getApiBaseUrl()}/portfolios/${encodedCode}/snapshot/current`;
  return result;
}

export function getSnapshotDatesFetchUrl(portfolioCode: string): string {
  let result = "";
  const encodedCode = encodePortfolioCodeForPath(portfolioCode);

  const source = getDataSource();
  if (source === "static") {
    result = `${getStaticDataPrefix()}/data/portfolios/${encodedCode}/snapshots-index.json`;
    return result;
  }

  result = `${getApiBaseUrl()}/portfolios/${encodedCode}/snapshots`;
  return result;
}

export function getSnapshotByDateFetchUrl(
  portfolioCode: string,
  asOfDate: string,
): string {
  let result = "";
  const encodedCode = encodePortfolioCodeForPath(portfolioCode);

  const source = getDataSource();
  if (source === "static") {
    result = `${getStaticDataPrefix()}/data/portfolios/${encodedCode}/snapshots/${asOfDate}.json`;
    return result;
  }

  result = `${getApiBaseUrl()}/portfolios/${encodedCode}/snapshots/${asOfDate}`;
  return result;
}

export function getSnapshotTrendsFetchUrl(
  portfolioCode: string,
  from?: string,
  to?: string,
): string {
  let result = "";
  const encodedCode = encodePortfolioCodeForPath(portfolioCode);

  const source = getDataSource();
  if (source === "static") {
    result = `${getStaticDataPrefix()}/data/portfolios/${encodedCode}/trends-summary.json`;
    return result;
  }

  const params = new URLSearchParams();
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  const query = params.toString();
  result = `${getApiBaseUrl()}/portfolios/${encodedCode}/snapshots/trends`;
  if (query !== "") {
    result = `${result}?${query}`;
  }
  return result;
}

export function getTargetAllocationsFetchUrl(portfolioCode: string): string {
  let result = "";
  const encodedCode = encodePortfolioCodeForPath(portfolioCode);

  const source = getDataSource();
  if (source === "static") {
    result = `${getStaticDataPrefix()}/data/portfolios/${encodedCode}/target-allocations.json`;
    return result;
  }

  result = `${getApiBaseUrl()}/portfolios/${encodedCode}/target-allocations`;
  return result;
}

export function getTargetPortfolioWeightsFetchUrl(portfolioCode: string): string {
  let result = "";
  const encodedCode = encodePortfolioCodeForPath(portfolioCode);

  const source = getDataSource();
  if (source === "static") {
    result = `${getStaticDataPrefix()}/data/portfolios/${encodedCode}/target-portfolio-weights.json`;
    return result;
  }

  result = `${getApiBaseUrl()}/portfolios/${encodedCode}/target-portfolio-weights`;
  return result;
}

export function getPortfoliosFetchUrl(): string {
  let result = "";

  const source = getDataSource();
  if (source === "static") {
    const basePath = getBasePath();
    const prefix = basePath.endsWith("/")
      ? basePath.slice(0, -1)
      : basePath;
    result = `${prefix}/data/portfolios.json`;
    return result;
  }

  result = `${getApiBaseUrl()}/portfolios`;
  return result;
}

export function getSnapshotLoadErrorMessage(): string {
  let result =
    "API に接続できません。`npm run dev:api` でローカル API を起動してください。";

  const source = getDataSource();
  if (source === "static") {
    result =
      "公開データを読み込めません。`npm run pages:export` で docs/data を更新し、コミットして push してください。";
    return result;
  }

  return result;
}
