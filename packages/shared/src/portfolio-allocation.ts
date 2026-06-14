import type { HoldingLineDto } from "./types";

export type TargetPortfolioWeight = {
  instrumentId: string;
  targetRatio: number;
};

export type PortfolioAllocationRow = {
  instrumentId: string;
  instrumentName: string;
  marketValueMinor: number;
  currentRatio: number;
  targetRatio: number | null;
  gapRatio: number | null;
  gapMarketValueMinor: number | null;
};

export function buildPortfolioAllocationRows(
  lines: HoldingLineDto[],
  targets: TargetPortfolioWeight[],
  assetTotalMinor: number,
): PortfolioAllocationRow[] {
  let result: PortfolioAllocationRow[] = [];

  const targetByInstrumentId = new Map<string, number>();
  for (const target of targets) {
    targetByInstrumentId.set(target.instrumentId, target.targetRatio);
  }

  for (const line of lines) {
    const currentRatio =
      assetTotalMinor > 0 ? line.marketValueMinor / assetTotalMinor : 0;
    const targetRatio = targetByInstrumentId.get(line.instrumentId) ?? null;
    let gapRatio: number | null = null;
    let gapMarketValueMinor: number | null = null;

    if (targetRatio !== null && Number.isFinite(targetRatio)) {
      gapRatio = currentRatio - targetRatio;
      if (assetTotalMinor > 0) {
        gapMarketValueMinor = Math.round(gapRatio * assetTotalMinor);
      }
    }

    result.push({
      instrumentId: line.instrumentId,
      instrumentName: line.instrumentName,
      marketValueMinor: line.marketValueMinor,
      currentRatio,
      targetRatio,
      gapRatio,
      gapMarketValueMinor,
    });
  }

  return result;
}
