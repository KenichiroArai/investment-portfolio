import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPortfolioKindLabel,
  PORTFOLIO_KIND_OPTIONS,
} from "@/features/manage/portfolio-kind-options";
import {
  listGenericMetricOptions,
  resolveGenericMetricLabel,
} from "@/features/manage/generic-metric-options";
import { IDECO_PORTFOLIO_METRIC_CODES } from "@repo/shared";

describe("portfolio-kind-options", () => {
  it("exports all portfolio kind options", () => {
    expect(PORTFOLIO_KIND_OPTIONS).toHaveLength(6);
    expect(getPortfolioKindLabel("ideco")).toBe("iDeCo");
    expect(getPortfolioKindLabel("monex")).toBe("マネックス証券");
    expect(getPortfolioKindLabel("rakuten")).toBe("楽天証券");
    expect(getPortfolioKindLabel("nisa")).toBe("NISA");
    expect(getPortfolioKindLabel("taxable")).toBe("課税口座");
    expect(getPortfolioKindLabel("satellite")).toBe("サテライト");
  });

  it("returns raw kind when label is unknown", () => {
    expect(getPortfolioKindLabel("unknown")).toBe("unknown");
  });
});

describe("generic-metric-options", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists generic metric options from shared labels", () => {
    const options = listGenericMetricOptions("ideco");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]?.code).toBe(IDECO_PORTFOLIO_METRIC_CODES.totalContributions);
    expect(resolveGenericMetricLabel(options[0]?.code ?? "")).toBe("拠出金累計");
  });

  it("returns code when label is unknown", () => {
    expect(resolveGenericMetricLabel("unknown_metric")).toBe("unknown_metric");
  });

  it("falls back when CSV labels are empty", async () => {
    vi.doMock("@repo/shared", async () => {
      const actual = await vi.importActual<typeof import("@repo/shared")>("@repo/shared");
      let result = {
        ...actual,
        IDECO_PORTFOLIO_METRIC_CSV_LABELS: {},
        IDECO_PORTFOLIO_METRIC_CODES: actual.IDECO_PORTFOLIO_METRIC_CODES,
      };
      return result;
    });

    vi.resetModules();
    const mod = await import("@/features/manage/generic-metric-options");
    const options = mod.listGenericMetricOptions("ideco");
    expect(options).toEqual([
      {
        code: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
        label: "拠出金累計",
      },
    ]);
  });
});
