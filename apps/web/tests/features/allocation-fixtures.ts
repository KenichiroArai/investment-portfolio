import type { AllocationSliceWithLines } from "@repo/shared";

export function makeAllocationSlice(
  overrides: Partial<AllocationSliceWithLines> &
    Pick<AllocationSliceWithLines, "valueCode" | "valueName">,
): AllocationSliceWithLines {
  let result: AllocationSliceWithLines = {
    valueCode: overrides.valueCode,
    valueName: overrides.valueName,
    marketValueMinor: overrides.marketValueMinor ?? 100_000,
    weight: overrides.weight ?? 0.6,
    unrealizedGainMinor: overrides.unrealizedGainMinor ?? null,
    unrealizedGainRate: overrides.unrealizedGainRate ?? null,
    lines: overrides.lines ?? [],
  };
  return result;
}

export const sampleAllocationSlices: AllocationSliceWithLines[] = [
  makeAllocationSlice({
    valueCode: "domestic",
    valueName: "国内",
    marketValueMinor: 600_000,
    weight: 0.6,
    lines: [
      {
        line: {
          id: "line-1",
          instrumentId: "inst-1",
          instrumentName: "国内ファンド",
          accountId: "ideco:unknown",
          accountName: "不明口座",
          sortOrder: 0,
          quantity: 10,
          marketValueMinor: 600_000,
          bookValueMinor: 500_000,
          metrics: [],
          instrumentAttributes: [],
          tags: [],
        },
        weightInSlice: 1,
        attributedMarketValueMinor: 600_000,
        attributedBookValueMinor: 500_000,
        attributedUnrealizedGainMinor: null,
        attributedUnrealizedGainRate: null,
      },
    ],
  }),
  makeAllocationSlice({
    valueCode: "foreign",
    valueName: "海外",
    marketValueMinor: 400_000,
    weight: 0.4,
    lines: [
      {
        line: {
          id: "line-2",
          instrumentId: "inst-2",
          instrumentName: "海外ファンド",
          accountId: "ideco:unknown",
          accountName: "不明口座",
          sortOrder: 1,
          quantity: 5,
          marketValueMinor: 400_000,
          bookValueMinor: 350_000,
          metrics: [],
          instrumentAttributes: [],
          tags: [],
        },
        weightInSlice: 1,
        portfolioName: "iDeCo",
        attributedMarketValueMinor: 400_000,
        attributedBookValueMinor: 350_000,
        attributedUnrealizedGainMinor: null,
        attributedUnrealizedGainRate: null,
      },
    ],
  }),
];
