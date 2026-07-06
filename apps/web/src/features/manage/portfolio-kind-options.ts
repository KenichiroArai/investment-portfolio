export const PORTFOLIO_KIND_OPTIONS = [
  { value: "ideco", label: "iDeCo" },
  { value: "monex", label: "マネックス証券" },
  { value: "nisa", label: "NISA" },
  { value: "taxable", label: "課税口座" },
  { value: "satellite", label: "サテライト" },
] as const;

export function getPortfolioKindLabel(kind: string): string {
  let result = kind;

  const option = PORTFOLIO_KIND_OPTIONS.find((item) => item.value === kind);
  if (option) {
    result = option.label;
  }

  return result;
}
