export function shouldShowSnapshotTimeBar(
  pathname: string,
  portfolioCode: string,
): boolean {
  let result = true;
  const base = `/portfolios/${portfolioCode}`;

  if (pathname.startsWith(`${base}/register`)) {
    result = false;
    return result;
  }

  if (pathname.startsWith(`${base}/edit`)) {
    result = false;
    return result;
  }

  if (pathname.startsWith(`${base}/analysis/settings`)) {
    result = false;
    return result;
  }

  return result;
}
