export class MonexCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MonexCsvError";
  }
}

export function normalizeMonexAccountLabel(value: string): string {
  let result = value.trim().normalize("NFKC");
  result = result.replace(/\s+/g, "");
  return result;
}

export function buildMonexAccountId(accountType: string, custodyType: string): string {
  let result = "monex:unknown";
  const normalizedAccountType = normalizeMonexAccountLabel(accountType);
  const normalizedCustodyType = normalizeMonexAccountLabel(custodyType);

  if (normalizedAccountType === "" && normalizedCustodyType === "") {
    return result;
  }

  if (normalizedCustodyType === "") {
    result = `monex:${normalizedAccountType}`;
    return result;
  }

  result = `monex:${normalizedAccountType}:${normalizedCustodyType}`;
  return result;
}

export function buildMonexAccountName(accountType: string, custodyType: string): string {
  let result = "不明口座";
  const normalizedAccountType = normalizeMonexAccountLabel(accountType);
  const normalizedCustodyType = normalizeMonexAccountLabel(custodyType);

  if (normalizedAccountType === "" && normalizedCustodyType === "") {
    return result;
  }

  if (normalizedCustodyType === "") {
    result = normalizedAccountType;
    return result;
  }

  result = `${normalizedAccountType} / ${normalizedCustodyType}`;
  return result;
}
