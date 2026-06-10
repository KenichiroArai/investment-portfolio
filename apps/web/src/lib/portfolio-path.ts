export function decodePortfolioCodeFromPath(segment: string): string {
  let result = segment;

  if (segment === "") {
    return result;
  }

  try {
    result = decodeURIComponent(segment);
  } catch {
    result = segment;
  }

  return result;
}

export function encodePortfolioCodeForPath(code: string): string {
  let result = encodeURIComponent(code);
  return result;
}

export function buildPortfolioPath(code: string, ...segments: string[]): string {
  let result = `/portfolios/${code}/`;

  for (const segment of segments) {
    if (segment === "") {
      continue;
    }

    const trimmed = segment.replace(/^\/+|\/+$/g, "");
    if (trimmed !== "") {
      result = `${result}${trimmed}/`;
    }
  }

  return result;
}

export async function resolvePortfolioCodeParam(
  params: Promise<{ code: string }>,
): Promise<string> {
  let result = "";
  const { code } = await params;
  result = decodePortfolioCodeFromPath(code);
  return result;
}
