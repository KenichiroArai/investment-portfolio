import type {
  ClassificationSchemeWithValuesDto,
  CreateClassificationSchemeInput,
  CreateClassificationValueInput,
  CreateInstrumentInput,
  CreatePortfolioInput,
  CurrentSnapshotDto,
  InstrumentClassificationsDto,
  InstrumentListItemDto,
  PortfolioDto,
  ReplaceCurrentSnapshotInput,
  SetInstrumentClassificationsInput,
  TargetAllocationsBySchemeDto,
  TargetAllocationWeightDto,
  TargetPortfolioWeightDto,
  UpdateClassificationSchemeInput,
  UpdateClassificationValueInput,
  UpdateInstrumentInput,
  UpdatePortfolioInput,
} from "@repo/shared";

import { getApiBaseUrl } from "@/lib/api-base";
import {
  isWritableDataSource,
  WRITABLE_BLOCKED_MESSAGE,
} from "@/lib/data-source";
import { encodePortfolioCodeForPath } from "@/lib/portfolio-path";

export type ApiErrorBody = {
  error: string | { fieldErrors?: Record<string, string[]> };
};

export { isWritableDataSource };

export function formatApiError(body: ApiErrorBody): string {
  let result = "リクエストに失敗しました。";

  if (typeof body.error === "string") {
    result = body.error;
    return result;
  }

  const fieldErrors = body.error.fieldErrors;
  if (fieldErrors) {
    const messages = Object.values(fieldErrors).flat();
    if (messages.length > 0) {
      result = messages.join(" ");
    }
  }

  return result;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  let result:
    | { ok: true; data: T }
    | { ok: false; status: number; message: string } = {
    ok: false,
    status: 0,
    message: "リクエストに失敗しました。",
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as ApiErrorBody;
        message = formatApiError(body);
      } catch {
        // ignore parse errors
      }
      result = { ok: false, status: response.status, message };
      return result;
    }

    if (response.status === 204) {
      result = { ok: true, data: undefined as T };
      return result;
    }

    const data = (await response.json()) as T;
    result = { ok: true, data };
    return result;
  } catch {
    result = {
      ok: false,
      status: 0,
      message:
        "API に接続できません。`npm run dev:api` でローカル API を起動してください。",
    };
    return result;
  }
}

async function requestWritableJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  let result:
    | { ok: true; data: T }
    | { ok: false; status: number; message: string } = {
    ok: false,
    status: 403,
    message: WRITABLE_BLOCKED_MESSAGE,
  };

  if (!isWritableDataSource()) {
    return result;
  }

  result = await requestJson<T>(path, init);
  return result;
}

export async function fetchPortfolio(code: string) {
  let result = await requestJson<PortfolioDto>(
    `/portfolios/${encodePortfolioCodeForPath(code)}`,
  );
  return result;
}

export async function createPortfolio(input: CreatePortfolioInput) {
  let result = await requestWritableJson<PortfolioDto>("/portfolios", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function updatePortfolio(code: string, input: UpdatePortfolioInput) {
  let result = await requestWritableJson<PortfolioDto>(
    `/portfolios/${encodePortfolioCodeForPath(code)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return result;
}

export async function deletePortfolio(code: string) {
  let result = await requestWritableJson<{ ok: boolean }>(
    `/portfolios/${encodePortfolioCodeForPath(code)}`,
    {
      method: "DELETE",
    },
  );
  return result;
}

export async function fetchClassificationSchemes(portfolioCode: string) {
  let result:
    | { ok: true; data: ClassificationSchemeWithValuesDto[] }
    | { ok: false; status: number; message: string } = {
    ok: true,
    data: [],
  };

  if (!isWritableDataSource()) {
    return result;
  }

  result = await requestJson<ClassificationSchemeWithValuesDto[]>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/classification-schemes`,
  );
  return result;
}

export async function createClassificationScheme(
  portfolioCode: string,
  input: CreateClassificationSchemeInput,
) {
  let result = await requestWritableJson<{ id: string; code: string; name: string }>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/classification-schemes`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return result;
}

export async function updateClassificationScheme(
  schemeId: string,
  input: UpdateClassificationSchemeInput,
) {
  let result = await requestWritableJson<{ id: string; code: string; name: string }>(
    `/classification-schemes/${schemeId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return result;
}

export async function deleteClassificationScheme(schemeId: string) {
  let result = await requestWritableJson<{ ok: boolean }>(
    `/classification-schemes/${schemeId}`,
    { method: "DELETE" },
  );
  return result;
}

export async function createClassificationValue(
  schemeId: string,
  input: CreateClassificationValueInput,
) {
  let result = await requestWritableJson<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
  }>(`/classification-schemes/${schemeId}/values`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function updateClassificationValue(
  valueId: string,
  input: UpdateClassificationValueInput,
) {
  let result = await requestWritableJson<{
    id: string;
    code: string;
    name: string;
    sortOrder: number;
  }>(`/classification-values/${valueId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return result;
}

export async function deleteClassificationValue(valueId: string) {
  let result = await requestWritableJson<{ ok: boolean }>(
    `/classification-values/${valueId}`,
    { method: "DELETE" },
  );
  return result;
}

export async function fetchInstruments(
  portfolioCode?: string,
  searchQuery?: string,
  accountId?: string,
) {
  let path = "/instruments";
  const params = new URLSearchParams();
  if (portfolioCode && portfolioCode.trim() !== "") {
    params.set("portfolioCode", portfolioCode.trim());
  }
  if (accountId && accountId.trim() !== "") {
    params.set("accountId", accountId.trim());
  }
  if (searchQuery && searchQuery.trim() !== "") {
    params.set("q", searchQuery.trim());
  }
  if (params.size > 0) {
    path = `${path}?${params.toString()}`;
  }
  let result = await requestJson<InstrumentListItemDto[]>(path);
  return result;
}

export async function createInstrument(input: CreateInstrumentInput) {
  let result = await requestWritableJson<InstrumentListItemDto>("/instruments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function updateInstrument(
  instrumentId: string,
  input: UpdateInstrumentInput,
) {
  let result = await requestWritableJson<InstrumentListItemDto>(
    `/instruments/${instrumentId}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return result;
}

export async function deleteInstrument(instrumentId: string) {
  let result = await requestWritableJson<{ ok: boolean }>(
    `/instruments/${instrumentId}`,
    { method: "DELETE" },
  );
  return result;
}

export async function fetchInstrumentClassifications(instrumentId: string) {
  let result = await requestJson<InstrumentClassificationsDto>(
    `/instruments/${instrumentId}/classifications`,
  );
  return result;
}

export async function setInstrumentClassifications(
  instrumentId: string,
  input: SetInstrumentClassificationsInput,
) {
  let result = await requestWritableJson<{ ok: boolean }>(
    `/instruments/${instrumentId}/classifications`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return result;
}

export async function fetchCurrentSnapshot(portfolioCode: string) {
  let result = await requestJson<CurrentSnapshotDto>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/snapshot/current`,
  );
  return result;
}

export async function replaceCurrentSnapshot(
  portfolioCode: string,
  input: ReplaceCurrentSnapshotInput,
) {
  let result = await requestWritableJson<CurrentSnapshotDto>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/snapshot/current`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
  return result;
}

export async function fetchTargetAllocations(portfolioCode: string) {
  let result = await requestJson<TargetAllocationsBySchemeDto>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/target-allocations`,
  );
  return result;
}

export async function replaceTargetAllocations(
  portfolioCode: string,
  schemeCode: string,
  weights: TargetAllocationWeightDto[],
) {
  let result = await requestWritableJson<{ schemeCode: string; weights: TargetAllocationWeightDto[] }>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/target-allocations/${encodeURIComponent(schemeCode)}`,
    {
      method: "PUT",
      body: JSON.stringify({ weights }),
    },
  );
  return result;
}

export async function fetchTargetPortfolioWeights(portfolioCode: string) {
  let result = await requestJson<{ weights: TargetPortfolioWeightDto[] }>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/target-portfolio-weights`,
  );
  return result;
}

export async function replaceTargetPortfolioWeights(
  portfolioCode: string,
  weights: TargetPortfolioWeightDto[],
) {
  let result = await requestWritableJson<{ weights: TargetPortfolioWeightDto[] }>(
    `/portfolios/${encodePortfolioCodeForPath(portfolioCode)}/target-portfolio-weights`,
    {
      method: "PUT",
      body: JSON.stringify({ weights }),
    },
  );
  return result;
}
