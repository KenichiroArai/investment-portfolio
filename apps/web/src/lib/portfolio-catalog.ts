import type { PortfolioDto } from "@repo/shared";

export const STATIC_PORTFOLIOS: PortfolioDto[] = [
  {
    "id": "8bdc1f30-b301-4dfc-a4ab-8cd68a4cd76b",
    "code": "ideco",
    "name": "iDeCo",
    "kind": "ideco"
  },
  {
    "id": "ec051fd8-fbe6-4b03-96db-362ca3ba1562",
    "code": "monex",
    "name": "マネックス証券",
    "kind": "monex"
  },
  {
    "id": "f8754882-2d04-4422-ab44-e4c08d633ded",
    "code": "rakuten",
    "name": "楽天証券",
    "kind": "rakuten"
  }
];

export function generatePortfolioStaticParams(): { code: string }[] {
  let result: { code: string }[] = [];

  for (const portfolio of STATIC_PORTFOLIOS) {
    result.push({ code: portfolio.code });
  }

  return result;
}

export function findPortfolioByCode(code: string): PortfolioDto | null {
  let result: PortfolioDto | null = null;

  const portfolio = STATIC_PORTFOLIOS.find((item) => item.code === code);
  if (!portfolio) {
    return result;
  }

  result = portfolio;
  return result;
}

