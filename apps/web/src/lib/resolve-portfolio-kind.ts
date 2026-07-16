import type { CurrentSnapshotDto } from "@repo/shared";

import { findPortfolioByCode } from "@/lib/portfolio-catalog";

export function resolvePortfolioKind(
  portfolioCode: string,
  snapshot?: CurrentSnapshotDto | null,
): string {
  let result = "ideco";

  if (snapshot?.portfolioKind) {
    result = snapshot.portfolioKind;
    return result;
  }

  const catalogPortfolio = findPortfolioByCode(portfolioCode);
  if (catalogPortfolio?.kind) {
    result = catalogPortfolio.kind;
    return result;
  }

  if (portfolioCode === "monex") {
    result = "monex";
    return result;
  }

  if (portfolioCode === "rakuten") {
    result = "rakuten";
    return result;
  }

  if (portfolioCode === "ideco") {
    result = "ideco";
    return result;
  }

  return result;
}
