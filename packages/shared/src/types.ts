import type { HoldingLineMetricDto } from "./holding-line-metrics";
import type { PortfolioSnapshotMetricDto } from "./portfolio-snapshot-metrics";

export type InstrumentAttributeDto = {
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

export type ClassificationTagDto = {
  schemeCode: string;
  schemeName: string;
  valueCode: string;
  valueName: string;
};

export type { HoldingLineMetricDto, PortfolioSnapshotMetricDto };

export type PortfolioDto = {
  id: string;
  code: string;
  name: string;
  kind: string;
};

export type HoldingLineDto = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  sortOrder: number | null;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
  metrics: HoldingLineMetricDto[];
  instrumentAttributes: InstrumentAttributeDto[];
  tags: ClassificationTagDto[];
};

export type AnalysisSchemeConfig = {
  schemeCode: string;
  schemeName: string;
};

export type CurrentSnapshotDto = {
  id: string;
  portfolioCode: string;
  portfolioName: string;
  asOfDate: string;
  analysisSchemes: AnalysisSchemeConfig[];
  metrics: PortfolioSnapshotMetricDto[];
  lines: HoldingLineDto[];
};

export type SnapshotDateListItemDto = {
  asOfDate: string;
  isCurrent: boolean;
};

export type SnapshotDateListDto = {
  portfolioCode: string;
  dates: SnapshotDateListItemDto[];
};

export type { SnapshotTrendPointDto, SnapshotTrendsDto } from "./snapshot-trends";

export type HealthDto = {
  status: "ok";
};
